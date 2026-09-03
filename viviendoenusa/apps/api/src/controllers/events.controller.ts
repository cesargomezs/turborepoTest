import { db } from "../../../../packages/db/src"; 
import { events, users, notifications, payments, tariffs, typeDetail, userDevices, promoCodes } from "../../../../packages/db/src/schema"; 
import { eq, desc, asc, sql, and, inArray } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';
import zipcodes from 'zipcodes'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const radiusMiles = process.env.RADIUMILE || 20; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// =====================================================================
// 🚀 FUNCIÓN LOCAL PARA COORDENADAS (Sin internet, súper rápida)
// =====================================================================
const getCoordsFromZip = (zip: string) => {
  if (!zip) return { lat: 34.0934, lng: -117.5847 };
  
  const locationInfo = zipcodes.lookup(zip as any);
  
  if (locationInfo) {
    return { 
      lat: locationInfo.latitude, 
      lng: locationInfo.longitude 
    };
  }
  
  return { lat: 34.0934, lng: -117.5847 };
};

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS
const sanitizeText = (str: any): string => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 🛡️ BARRERA DE SANITIZACIÓN PARA OBJETOS
const sanitizePayload = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  const sanitizedData: any = {};
  for (const key in data) {
    if (typeof data[key] === 'string') {
      sanitizedData[key] = sanitizeText(data[key]);
    } else {
      sanitizedData[key] = data[key];
    }
  }
  return sanitizedData;
};

// 💰 FUNCIÓN AUXILIAR: Trae el precio actual de la BD
const getCurrentEventPrice = async () => {
  try {
    const currentYear = new Date().getFullYear().toString();

    const activeTariff = await db.select({ price: tariffs.priceBasic })
    .from(tariffs)
    .innerJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`) 
    .leftJoin(payments, and(eq(payments.entityId, events.id), eq(payments.entityType, 'event')))
    .where(
      and(
        sql`${typeDetail.typeCode} ILIKE 'Event%'`, 
        eq(tariffs.isActive, true),
        eq(tariffs.planType, currentYear) 
      )
    )
    .limit(1);

    if (activeTariff && activeTariff.length > 0 && activeTariff[0].price) {
      return activeTariff[0].price;
    }
  } catch (error) {
    console.warn("⚠️ Error obteniendo tarifa dinámica con JOIN, usando $50.00 por defecto");
  }
  return "50.00";
};

// ============================================================================
// 🚀 FUNCIÓN LOCAL PARA ENVÍO MASIVO (FILTRADO POR USUARIOS CERCANOS)
// ============================================================================
const sendMassPushNotification = async (payload: { title: string, body: string, referenceId: string, userIds: string[] }) => {
  try {
    if (!payload.userIds || payload.userIds.length === 0) return;

    const devices = await db.select()
      .from(userDevices)
      .where(inArray(userDevices.userId, payload.userIds)); 

    if (!devices || devices.length === 0) {
      console.log("🔕 [PUSH MASIVO EVENTOS] Ningún usuario cercano tiene dispositivos registrados.");
      return;
    }

    const messages = devices.map(device => ({
      to: device.expoPushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: { type: "event", referenceId: payload.referenceId },
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    console.log(`📱 [PUSH MASIVO EVENTOS] Enviando ${messages.length} notificaciones en la zona...`);

    for (const chunk of chunks) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    }
    console.log(`✅ [PUSH MASIVO EVENTOS] ¡Envío completado exitosamente!`);
  } catch (error) {
    console.error("❌ [PUSH MASIVO EVENTOS] Error enviando notificaciones:", error);
  }
};

// =====================================================================
// 📲 NUEVA FUNCIÓN: ALERTA DE TELEGRAM PARA EVENTOS
// =====================================================================
const sendTelegramAlert = async (eventName: string, refCode: string, method: string) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) {
    console.warn("⚠️ Credenciales de Telegram no configuradas.");
    return;
  }

  const message = `🎉 *NUEVO EVENTO REGISTRADO*\n\n*Evento:* ${eventName}\n*Pago:* ${method}\n*Referencia:* ${refCode}\n\n⚠️ Ingresa al panel de administrador en la app para verificar y aprobar.`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error("❌ Error enviando alerta a Telegram:", err);
  }
};

// =====================================================================
// 🔍 1. CONSULTA GENERAL (Optimizada con Geofencing Local)
// =====================================================================
export const getEvents = async (zip?: string) => {
  try {
    const cleanZipParam = zip ? sanitizeText(String(zip)) : null;
    
    let baseConditions = and(
      eq(events.statusId, '31a06434-8ed8-45d2-b95f-65bd314bc021'),
      sql`${events.dateEvent} >= CURRENT_DATE`
    );
                        
    let finalConditions: any = baseConditions;

    if (cleanZipParam && cleanZipParam.length === 5) {
      const nearbyZips = zipcodes.radius(cleanZipParam as any, Number(radiusMiles)); 

      if (nearbyZips && nearbyZips.length > 0) {
        finalConditions = and(baseConditions, inArray(events.zip, nearbyZips as string[]));
      } else {
        finalConditions = and(baseConditions, eq(events.zip, cleanZipParam));
      }
    }

    let query = db
      .select({
        events: events,
        users: users,
        payments: payments,
      })
      .from(events)
      .leftJoin(users, eq(events.userId, users.id)) 
      .leftJoin(payments, and(eq(payments.entityId, events.id), eq(payments.entityType, 'event')))
      .where(finalConditions)
      .orderBy(asc(events.dateEvent)); // 🚀 Ordenado por la fecha del evento más cercana

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    return await Promise.all(rows.map(async (row: any) => {
        const dbEvent = row.events;
        const dbUser = row.users;
        const dbPayment = row.payments;

        const nombreUsuario = dbUser?.name || dbUser?.firstName || dbUser?.first_name || dbUser?.full_name || 'Usuario Anónimo';
        
        const fileName = dbEvent.imageEven;
        let publicUrl = fileName; 

        if (fileName && typeof fileName === 'string' && fileName.trim() !== '' && !fileName.startsWith('http')) {
            const { data } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(`events/${fileName.replace('events/', '')}`, 3600); 
            if (data?.signedUrl) publicUrl = data.signedUrl;
        }

        return { 
            ...dbEvent,
            imageEven: publicUrl, 
            ownerName: nombreUsuario,
            referenceCode: dbPayment?.referenceCode,
            paymentMethod: dbPayment?.paymentMethod || '',
        }; 
    }));
  } catch (error) {
    console.error("❌ Error en getEvents:", error);
    return [];
  }
};

// =====================================================================
// 🔍 2. CONSULTA INDIVIDUAL POR ID CON PAGOS
// =====================================================================
export const getEventById = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select()
      .from(events)
      .leftJoin(users, eq(events.userId, users.id))
      .leftJoin(payments, and(eq(payments.entityId, events.id), eq(payments.entityType, 'event')))
      .where(eq(events.id, cleanId));

    if (!rows || rows.length === 0) return null;

    const dbEvent = rows[0].events;
    const dbUser = rows[0].users;
    const dbPayment = rows[0].payments;
    const nombreUsuario = dbUser?.name || 'Usuario Anónimo';

    let publicUrl = dbEvent.imageEven;

    if (publicUrl && typeof publicUrl === 'string' && publicUrl.trim() !== '' && !publicUrl.startsWith('http')) {
        const cleanName = publicUrl.replace('events/', '');
        const { data, error } = await supabase.storage
            .from(NOMBRE_BUCKET).createSignedUrl(`events/${cleanName}`, 3600);
            
        if (!error && data?.signedUrl) {
            publicUrl = data.signedUrl;
        }
    }

    return {
        ...dbEvent,
        imageEven: publicUrl,
        ownerName: nombreUsuario,
        referenceCode: dbPayment?.referenceCode,
        paymentMethod: dbPayment?.paymentMethod || '',
    };
  } catch (error: any) {
    throw new Error(`Error al obtener el evento por ID: ${error.message}`);
  }
};

// =====================================================================
// 📥 3. CREAR EVENTO (AUTO-APROBACIÓN CUPÓN + NOTIFICACIONES MASIVAS)
// =====================================================================
export const createEvent = async (data: any) => {
  try {
    const cleanData = sanitizePayload(data);
    
    const validUserId = sanitizeText(cleanData.userId);
    if (!validUserId) {
      throw new Error("El ID del usuario es obligatorio para registrar un evento.");
    }

    const planSeleccionado = cleanData.premiumPlan || cleanData.premium_plan || 'basic'; 
    const metodoPago = cleanData.paymentMethod ? String(cleanData.paymentMethod).toLowerCase().trim() : '';
    const codigoReferencia = cleanData.referenceCode ? String(cleanData.referenceCode).trim() : '';

    const isCoupon = planSeleccionado === 'coupon' || metodoPago === 'coupon' || planSeleccionado === 'cupon' || metodoPago === 'cupon';
    
    let realPromoCode = cleanData.couponCode ? String(cleanData.couponCode).trim() : codigoReferencia.replace('COUPON-', '').trim();

    const { lat, lng } = getCoordsFromZip(cleanData.zip || '');

    let cleanImage = cleanData.imageEven || '';
    if (typeof cleanImage === 'string' && cleanImage.startsWith('events/')) {
        cleanImage = cleanImage.replace('events/', '');
    }

    let pushNotificationData: any = null; // 🚀 PAYLOAD PARA PUSH DE EVENTOS (CUPÓN)
    let isApproved = false;
    let customMessage = "Enviado con éxito, pendiente de revisión de pago.";

    const createdEventResult = await db.transaction(async (tx) => {
        
        if (isCoupon) {
          if (!realPromoCode) throw new Error("Por favor, ingresa el código del cupón.");
          
          const [promo] = await tx.select().from(promoCodes).where(sql`LOWER(${promoCodes.code}) = LOWER(${realPromoCode})`);
          
          if (!promo) throw new Error(`El cupón '${realPromoCode}' es inválido o no existe.`);
          if (promo.isUsed) throw new Error("Este cupón ya fue utilizado anteriormente.");

          isApproved = true;
          customMessage = "¡Cupón aplicado! Tu evento ha sido publicado con éxito.";
        }

        const payload: any = {
          title: cleanData.title || 'Sin título',
          categoryIdx: cleanData.categoryIdx || 0,
          dateEvent: cleanData.dateEvent || new Date().toISOString(),
          timeStart: cleanData.timeStart || '',
          timeEnd: cleanData.timeEnd || '',
          descriptionEven: cleanData.descriptionEven || '',
          imageEven: cleanImage,
          locationEven: cleanData.locationEven || '',
          lat: lat,
          lng: lng,
          zip: cleanData.zip ? String(cleanData.zip).trim() : '',
          estate: cleanData.estate || '',
          phone: cleanData.phone || '',
          contactMethod: cleanData.contactMethod || 'whatsapp',
          statusId: '31a06434-8ed8-45d2-b95f-65bd314bc021',
          premiumPlan: isCoupon ? 'coupon' : planSeleccionado, 
          userId: validUserId, 
          approved: isApproved, 
        };

        if (isCoupon) {
          payload.timepostEnd = sql`NOW() + INTERVAL '1 month'`;
          payload.timepost_end = sql`NOW() + INTERVAL '1 month'`;
        }

        const [newEvent] = await tx.insert(events).values(payload).returning();

        if (codigoReferencia || realPromoCode) {
            const today = new Date();
            const eventDate = new Date(payload.dateEvent);
            const diffTime = eventDate.getTime() - today.getTime();
            const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            const paymentPayload: any = {
              entityType: 'event', 
              entityId: newEvent.id,
              userId: validUserId, 
              referenceCode: realPromoCode || codigoReferencia, 
              paymentMethod: isCoupon ? 'Coupon' : metodoPago, 
              amount: String(isCoupon ? "0.00" : (cleanData.tariffPlan || await getCurrentEventPrice())), 
              durationDays: daysLeft, 
              status: isCoupon ? "approved" : "pending"
            };

            if (isCoupon) {
              paymentPayload.approvedAt = sql`NOW()`;
              paymentPayload.timepostEnd = sql`NOW() + INTERVAL '1 month'`;
              paymentPayload.timepost_end = sql`NOW() + INTERVAL '1 month'`;
            } else if (eventDate) {
              paymentPayload.timepostEnd = eventDate;
              paymentPayload.timepost_end = eventDate;
            }

            await tx.insert(payments).values(paymentPayload);
        }

        if (isCoupon) {
          await tx.update(promoCodes)
          .set({
            isUsed: true, 
            usedByUserId: validUserId, 
            usedForEntityId: newEvent.id, 
            entityType: 'event',
            usedAt: new Date() 
          })
          .where(sql`LOWER(${promoCodes.code}) = LOWER(${realPromoCode})`); 

          // ==============================================================
          // 🚀 PROGRAMACIÓN DE NOTIFICACIONES PARA EVENTOS POR CUPÓN
          // ==============================================================
          if (newEvent && newEvent.dateEvent) {
              const today = new Date();
              const eventDate = new Date(newEvent.dateEvent);
              const diffTime = eventDate.getTime() - today.getTime();
              const totalDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (totalDaysLeft >= 0 && newEvent.userId) {
                  const notifsToInsert = [];
                  for (let i = 0; i <= totalDaysLeft; i++) {
                      const daysRemaining = totalDaysLeft - i;
                      const showDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
                      let shouldCreate = false;
                      let message = "";

                      if (daysRemaining === 0) {
                          shouldCreate = true;
                          message = `¡Es hoy! No te pierdas: ${newEvent.title}`;
                      } else if (daysRemaining > 0 && daysRemaining <= 10) {
                          shouldCreate = true;
                          message = `¡Faltan solo ${daysRemaining} días para ${newEvent.title}!`;
                      } else if (daysRemaining > 10) {
                          if (daysRemaining % 2 === 0) { 
                              shouldCreate = true;
                              message = `Faltan ${daysRemaining} días para el evento: ${newEvent.title}`;
                          }
                      }

                      if (shouldCreate) {
                          const notifObj: any = {
                              title: "Recordatorio de Evento 📅",
                              description: message,
                              type: "event", 
                              visibleAt: showDate, 
                              userId: newEvent.userId as string, 
                          };

                          if ('referenceId' in notifications) notifObj.referenceId = String(newEvent.id);
                          else if ('reference_id' in notifications) notifObj.reference_id = String(newEvent.id);

                          notifsToInsert.push(notifObj);
                      }
                  }

                  if (notifsToInsert.length > 0) {
                      await tx.insert(notifications).values(notifsToInsert);
                  }
              }

              console.log("✅ [DEBUG PUSH EVENTOS] Evento creado y aprobado vía Cupón. Buscando usuarios cercanos...");
              const titleText = "¡Nuevo Evento en tu área! 🎉";
              const bodyText = `Se ha publicado: ${newEvent.title}. ¡Revisa los detalles!`;
              let usersToNotify: { id: string }[] = [];

              if (newEvent.zip) {
                  const nearbyZips = zipcodes.radius(newEvent.zip as any, Number(radiusMiles)); 

                  if (nearbyZips && nearbyZips.length > 0) {
                      usersToNotify = await tx.select({ id: users.id })
                                              .from(users)
                                              .where(inArray(users.zip, nearbyZips as string[]));
                  } else {
                      usersToNotify = await tx.select({ id: users.id })
                                              .from(users)
                                              .where(eq(users.zip, String(newEvent.zip)));
                  }
              }

              if (usersToNotify.length > 0) {
                  const massNotifs = usersToNotify.map(u => {
                      const payloadNotif: any = {
                          title: titleText,
                          description: bodyText,
                          type: "event", 
                          visibleAt: new Date(), 
                          userId: u.id,
                          isRead: false
                      };
                      if ('referenceId' in notifications) payloadNotif.referenceId = String(newEvent.id);
                      else if ('reference_id' in notifications) payloadNotif.reference_id = String(newEvent.id);
                      return payloadNotif;
                  });

                  await tx.insert(notifications).values(massNotifs);

                  pushNotificationData = {
                      title: titleText,
                      body: bodyText,
                      referenceId: String(newEvent.id),
                      userIds: usersToNotify.map(u => u.id) 
                  };
              }
          }
        }

        return {
           ...newEvent,
           timepostEnd: newEvent.timepostEnd || null,
           referenceCode: isCoupon ? realPromoCode : codigoReferencia,
           paymentMethod: isCoupon ? 'Coupon' : metodoPago,
           message: customMessage 
        };
    });

    // 🚀 DISPARAR PUSH DE EVENTOS FUERA DE LA TRANSACCIÓN
    if (pushNotificationData) {
        sendMassPushNotification(pushNotificationData).catch(err => {
            console.error("❌ [DEBUG PUSH EVENTOS] Falló el Push Notification en creación por cupón:", err);
        });
    }

    if (createdEventResult && createdEventResult.paymentMethod !== 'Coupon') {
      sendTelegramAlert(
        createdEventResult.title || 'Sin título',
        createdEventResult.referenceCode || 'N/A',
        createdEventResult.paymentMethod || 'N/A'
      ).catch(e => console.log("Notificación de Telegram falló en segundo plano", e));
    }

    return createdEventResult;

  } catch (error: any) { 
    console.error("❌ Error en createEvent:", error);
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint')) || (error.message && error.message.includes('duplicate key'))) {
       throw new Error("El código de referencia de pago ya está en uso.");
    }
    throw new Error(error.message || "Error al crear el evento.");
  }
};

// =====================================================================
// 🔄 4. ACTUALIZAR EVENTO Y PROGRAMAR NOTIFICACIONES
// =====================================================================
export const updateEvent = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const cleanPayload = sanitizePayload(data);
    let pushNotificationData: any = null;

    if (cleanPayload.imageEven && typeof cleanPayload.imageEven === 'string' && cleanPayload.imageEven.startsWith('events/')) {
        cleanPayload.imageEven = cleanPayload.imageEven.replace('events/', '');
    }
    
    const [existingEvent] = await db.select().from(events).where(eq(events.id, cleanId));
    if (!existingEvent) throw new Error("Evento no encontrado");
    
    const wasApprovedBefore = existingEvent.approved === true;

    const eventResult = await db.transaction(async (tx) => {
        if (cleanPayload.approved === true) {
            cleanPayload.createdAt = new Date();
        }

        const updated = await tx.update(events).set(cleanPayload).where(eq(events.id, cleanId)).returning();
        const event = updated[0];

        if (!event) throw new Error("No se pudo encontrar el evento actualizado");

        if (cleanPayload.approved === true) {
            const expirationDate = event.dateEvent ? new Date(event.dateEvent) : new Date();

            const paymentUpdatePayload: any = { 
                status: 'approved', 
                approvedAt: new Date()
            };

            if ('timepostEnd' in payments) paymentUpdatePayload.timepostEnd = expirationDate;
            else if ('timepost_end' in payments) paymentUpdatePayload.timepost_end = expirationDate;

            await tx.update(payments)
                .set(paymentUpdatePayload)
                .where(and(eq(payments.entityId, cleanId), eq(payments.entityType, 'event')));
        }

        if (cleanPayload.approved === true && !wasApprovedBefore && event && event.dateEvent) {
            const today = new Date();
            const eventDate = new Date(event.dateEvent);
            const diffTime = eventDate.getTime() - today.getTime();
            const totalDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (totalDaysLeft >= 0 && event.userId) {
                const notifsToInsert = [];
                for (let i = 0; i <= totalDaysLeft; i++) {
                    const daysRemaining = totalDaysLeft - i;
                    const showDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
                    let shouldCreate = false;
                    let message = "";

                    if (daysRemaining === 0) {
                        shouldCreate = true;
                        message = `¡Es hoy! No te pierdas: ${event.title}`;
                    } else if (daysRemaining > 0 && daysRemaining <= 10) {
                        shouldCreate = true;
                        message = `¡Faltan solo ${daysRemaining} días para ${event.title}!`;
                    } else if (daysRemaining > 10) {
                        if (daysRemaining % 2 === 0) { 
                            shouldCreate = true;
                            message = `Faltan ${daysRemaining} días para el evento: ${event.title}`;
                        }
                    }

                    if (shouldCreate) {
                        const notifObj: any = {
                            title: "Recordatorio de Evento 📅",
                            description: message,
                            type: "event", 
                            visibleAt: showDate, 
                            userId: event.userId as string, 
                        };

                        if ('referenceId' in notifications) notifObj.referenceId = String(event.id);
                        else if ('reference_id' in notifications) notifObj.reference_id = String(event.id);

                        notifsToInsert.push(notifObj);
                    }
                }

                if (notifsToInsert.length > 0) {
                    await tx.insert(notifications).values(notifsToInsert);
                }
            }

            console.log("✅ [DEBUG PUSH EVENTOS] Evento aprobado. Buscando usuarios cercanos...");
            const titleText = "¡Nuevo Evento en tu área! 🎉";
            const bodyText = `Se ha publicado: ${event.title}. ¡Revisa los detalles!`;
            let usersToNotify: { id: string }[] = [];

            if (event.zip) {
                const nearbyZips = zipcodes.radius(event.zip as any, Number(radiusMiles)); 

                if (nearbyZips && nearbyZips.length > 0) {
                    usersToNotify = await tx.select({ id: users.id })
                                            .from(users)
                                            .where(inArray(users.zip, nearbyZips as string[]));
                } else {
                    usersToNotify = await tx.select({ id: users.id })
                                            .from(users)
                                            .where(eq(users.zip, String(event.zip)));
                }
            }

            if (usersToNotify.length > 0) {
                const massNotifs = usersToNotify.map(u => {
                    const payload: any = {
                        title: titleText,
                        description: bodyText,
                        type: "event", 
                        visibleAt: new Date(), 
                        userId: u.id,
                        isRead: false
                    };
                    if ('referenceId' in notifications) payload.referenceId = String(event.id);
                    else if ('reference_id' in notifications) payload.reference_id = String(event.id);
                    return payload;
                });

                await tx.insert(notifications).values(massNotifs);

                pushNotificationData = {
                    title: titleText,
                    body: bodyText,
                    referenceId: String(event.id),
                    userIds: usersToNotify.map(u => u.id) 
                };
            }
        }

        return event || null;
    });

    if (pushNotificationData) {
        sendMassPushNotification(pushNotificationData).catch(err => {
           console.error("❌ [DEBUG PUSH] Falló el Push Notification:", err);
        });
    }

    return eventResult;

  } catch (error: any) { 
    throw new Error(`Error al actualizar el evento: ${error.message}`);
  }
};

export const deleteEvent = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const deleted = await db.delete(events).where(eq(events.id, cleanId)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el evento: ${error.message}`);
  }
};