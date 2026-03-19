import { StyleSheet, Platform, useColorScheme, ViewStyle } from 'react-native';

export const useUnifiedCardStyles = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'light';

  // --- PALETA DE COLORES ESTILO 'COMUNIDAD' ---
  const glassColors = {
    // Fondo negro con opacidad como en la imagen
    cardBg: isDark ? 'rgba(18, 18, 18, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    // Inputs oscuros con opacidad suave
    inputBg: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.9)',
    // Ítems inactivos estilo cápsula de la imagen
    itemBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    // Bordes sutiles (el "ojo" de tu prompt)
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#A0A0A0' : '#666',
    // Rosa Community
    accent: '#FF5F6D' 
  };

  return StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { 
      flexGrow: 1, 
      paddingVertical: 20, 
      // Ajuste para superponer header en web
      marginTop: Platform.OS === 'web' ? -100 : (Platform.OS === 'ios' ? -19 : 20) 
    },
    centerContainer: { 
      width: '100%', 
      alignItems: 'center', 
      justifyContent: 'center', 
      flex: 1 
    },

    // --- EL CONTENEDOR 'GLASS' PRINCIPAL ---
    cardWrapper: {
      borderRadius: 40,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: glassColors.border,
      // Transparente en iOS para el BlurView, sólido con opacidad en Android
      backgroundColor: Platform.OS === 'android' ? glassColors.cardBg : 'transparent',
      ...Platform.select({
        ios: { 
          shadowColor: "#000", 
          shadowOffset: { width: 0, height: 15 }, 
          shadowOpacity: 0.25, 
          shadowRadius: 20 
        },
        android: { elevation: 12 },
      }),
    } as ViewStyle,

    cardContent: { flex: 1, padding: 30, zIndex: 10 },

    // --- FORMULARIO Y BUSCADOR WEB ---
    formContainer: { marginBottom: 15 },
    searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
    customInput: { 
      flex: 1, 
      height: 48, 
      borderRadius: 14, 
      paddingHorizontal: 16, 
      borderWidth: 1,
      borderColor: glassColors.border,
      backgroundColor: glassColors.inputBg,
      color: glassColors.text,
      fontSize: 14
    },
    compactSearchBtn: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden' },
    gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // --- LISTA DE ABOGADOS (LAW CARDS) TRASLÚCIDAS ---
    lawyerCard: { 
      flexDirection: 'row', 
      padding: 15, 
      borderRadius: 22, 
      alignItems: 'center', 
      marginBottom: 12,
      backgroundColor: glassColors.itemBg, // Fondo sutil
      borderWidth: 1,
      borderColor: glassColors.border
    },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    ratingDistRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    smallText: { fontSize: 12, fontWeight: '600', color: glassColors.text },
    actionGroup: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    actionBtn: { 
        width: 38, 
        height: 38, 
        borderRadius: 19, 
        justifyContent: 'center', 
        alignItems: 'center',
        borderWidth: 1
    },

    // --- VISTA WEB ESTILO 'COMUNIDAD' (LA IMAGEN) ---
    // 1. Línea vertical divisoria
    webSidebar: { 
        width: 240, 
        borderRightWidth: 1, 
        borderColor: glassColors.border, // Línea sutil como en la imagen
        paddingRight: 20 
    },
    // 2. Mayúsculas y espaciado de 'FILTRAR'
    sideMenuTitle: { 
      fontSize: 11, 
      fontWeight: '800', 
      marginBottom: 25, 
      letterSpacing: 1.5, // Más espaciado
      textTransform: 'uppercase', // 'FILTRAR'
      color: isDark ? 'rgba(255,255,255,0.5)' : '#666'
    },
    // 3. Botones estilo cápsula de la imagen
    sideMenuItem: { 
      paddingVertical: 14, // Más altos
      paddingHorizontal: 18, 
      borderRadius: 20, // Más redondeados (cápsula)
      marginBottom: 10, 
      flexDirection: 'row', 
      alignItems: 'center', 
      borderWidth: 1,
      borderColor: 'transparent' // Transparent cuando activo (usamos background rosa)
    },
    sideMenuItemText: { fontSize: 14, letterSpacing: 0.3 },

    // --- OTROS COMPONENTES ---
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerIcons: { flexDirection: 'row', alignItems: 'center' },
    mapContainer: { height: 180, borderRadius: 20, overflow: 'hidden', marginVertical: 10, borderWidth: 1, borderColor: glassColors.border },
    mapWrapperWeb: { flex: 1, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: glassColors.border },
    locationBtn: { 
      position: 'absolute', bottom: 20, right: 20, padding: 10, borderRadius: 12, 
      backgroundColor: isDark ? '#222' : '#FFF', elevation: 5, borderWidth: 1, borderColor: glassColors.border
    },
    // Chips para móvil
    chipsScroll: { flexDirection: 'row', marginBottom: 15 },
    chip: { 
      paddingHorizontal: 16, 
      paddingVertical: 8, 
      borderRadius: 12, 
      borderWidth: 1, 
      marginRight: 8,
      borderColor: glassColors.border,
      backgroundColor: glassColors.itemBg
    },
    resultsWrapper: { marginTop: 10 }
  });
};