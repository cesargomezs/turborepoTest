import { Filter } from "bad-words";
import { time } from "console";
import { create } from "domain";
import { register } from "module";
import { use } from "react";

// constants/Languages.ts
export const translations = {
  es: {
    home: "Inicio",
    profile: "Perfil",
    vision: "Visión",
    mision: "Misión",
    welcome: "Hola, Cesar",
    select_lang: "Seleccionar Idioma",
    
    tabs: {
      home: "Inicio",
      services: "Servicios",
      settings: "Configuración",
      logout: "Cerrar Sesión"
    },
    hometab: {
        registerhome: "Regístrarme",
        acces: "Ingresar",
        login: "Iniciar Sesión",
        register: "Regístrate aquí",
        haveaccount: "¿Ya tienes cuenta?  ",
        nohaveaccount: "¿No tienes cuenta?  ",
        dateBirthday: "Fecha de nacimiento",
        username: "Usuario:",
        password: "Contraseña:",
        googleacount: "Continuar con Google",
        mission: "Nuestra Misión",
        ready: "Listo",   
        missiondesc: "Crear comunidades más unidas, participativas y solidarias, donde cada residente se sienta conectado, seguro y orgulloso de su barrio.",
        vision: "Nuestra Visión",
        visiondesc: "Fortalecer las economías locales conectando a los residentes con los comercios y servicios de su barrio, promoviendo el consumo local y facilitando un ecosistema de intercambio y colaboración."
    },
    servicestab:{
      service1: "Abogados",
      icon1: "scale-balance",
      service2: "Comunidad",
      icon2: "account-group-outline",
      service3: "Donaciones",
      icon3: "hand-heart",
      service4: "Eventos",
      icon4: "calendar-clock",
      service5: "Tiendas",
      icon5: "shopping-search",
      service6: "Emprendimientos",
      icon6: "lightbulb-multiple-outline",
      help_question: "¿En qué podemos ayudarte hoy?"
    },
    lawyerstab: {
      label: "Especialidades",
      practiceAreas: ['Todas', 'Familia', 'Penal', 'Inmigración', 'Accidentes'], 
      //practiceAreas: "all",
      messagezip: "Código Postal",
      validatezip: "Código Postal no encontrado.",
      resultone: "Resultado encontrado",
      resultdomore: "Resultados encontrados",
      viewallresults: "Ver todos los resultados",
      zipnofound:"ZIP no encontrado.",
      noReviews: "Aún no hay reseñas.", // <--- Agrega esta
      addReview: "Danos tu opinión",    // <--- Agrega esta
      placeholderReview: "Escribe tu experiencia...", // <--- Agrega esta
      publishBtn: "Publicar reseña" ,     // <--- Agrega esta
      typeReview: "Escribir mi opinión",
      experience:"¿Cómo fue tu experiencia?",
      backBtn: "Volver",
      recent: "Reciente"
      
    },
    communitytab: {
      labeltypepost: "Tipo de publicación",
      typepost : ['Todos', 'Experiencia', 'Pregunta', 'Consejo'],
      typepostAdd : ['Experiencia', 'Pregunta', 'Consejo'],
      messagenewpost: "Nueva publicación",
      closepost: "Cerrar",
      botonpost: "Publicar",
      firtscomment: "Sé el primero en comentar",
      questionnewpost: '¿Qué quieres compartir?',
      textInappropriateTittle: "Contenido inapropiado",
      textInappropriateDescription: "Tu mensaje contiene palabras no permitidas. Por favor, mantén un lenguaje respetuoso.",
      imageInappropriateTittle: "Imagen rechazada",
      imageInappropriateDescription: "Nuestra IA detectó contenido sensible. Por favor elige otra imagen.",
      publishedPostLabel: "¡Éxito!",
      publishedPostDescription: "Tu post ha sido publicado.",
      errorServer: "No se pudo conectar con el servidor de moderación.",
      category: "Categoría",
      subCategories: ['General','Comida','Trabajo','Trámites','Salud','Nuevos'],
      filter:"Filtrar",
      placeHolderModal: "Escribe algo...",
      sendbutton: "Enviar",
      responsebutton: "Responder",
      messageNewPost:"¿Qué estás pensando?"
    },
    donationstab: {
        category: "Categorías",
        subCategories: ['Todas','Ropa','Alimentos','Muebles','Electrónica','Otros'],
        messageMessageDonation: "Nueva donación",
        messageDonation: "¿Qué te gustaría donar o necesitas?",
        closeDonation: "Cerrar",
        botonDonation: "Publicar",
        statusBottonModalDis: "Disponibles",
        statusBottonModalDel: "Entregados",
        statusDonatioAct: "Entregado",
        statusDonatioReact: "Reactiva",
        newdonnationTittle: "Titulo de la donación",
        newdonnationdescription: "Describe brevemente el estado",
        textInappropriateTittle: "Contenido inapropiado",
        textInappropriateDescription: "Tu mensaje contiene palabras no permitidas. Por favor, mantén un lenguaje respetuoso.",
        imageInappropriateTittle: "Imagen rechazada",
        imageInappropriateDescription: "Nuestra IA detectó contenido sensible. Por favor elige otra imagen.",
        publishedDonationLabel: "¡Éxito!",
        publishedDonationDescription: "Tu publicación ha sido publicada.",
        errorServer: "No se pudo conectar con el servidor de moderación.",
        sendbutton: "Enviar",
        messagenotdonnations:"No se encontraron donaciones disponibles.",
        choisephoto:"Seleccionar fotografía",
        callbton: "Llamada",
        typeContact: "Método de contacto"
    },
    eventstab: {
        label: "Eventos",
        filter: "Filtros",
        botonEvent: "Publicar evento",
        photoEvent :"Foto del evento",
        typeEvent: "Tipo de evento",
        dateEvent: "Fecha del evento",
        timeEvent: "Horario (Inicio - Fin)",
        readyBtn: "Listo",
        nameEvent: "Nombre del evento",
        addressEvent: "Dirección del evento",
        detailsEvent: "Detalles del evento",
        sharringEvent: "Compartir evento",
        createEvent: "Crear evento"
    }

    
  },
  en: {
    home: "Home",
    profile: "Profile",
    vision: "Vision",
    mision: "Mission",
    welcome: "Hello, Cesar",
    select_lang: "Select Language",
    tabs: {
      home: "Home",
      services: "Services",
      settings: "Settings",
      logout: "Close Session"
    },
    hometab: {
        registerhome: "Register",
        acces: "Access",
        login: "Login",
        register: "Register here",
        haveaccount: "Already have an account?",  
        nohaveaccount: "Don't have an account?",
        dateBirthday: "Birthdate",
        username: "Username:",
        password: "Password:",
        googleacount: "Continue with Google",
        mission: "Our Mission",  
        ready: "Ready", 
        missiondesc: "Create more united, participative and supportive communities, where every resident feels connected, safe and proud of their neighborhood.",
        vision: "Our Vision",
        visiondesc: "Strengthen local economies by connecting residents with the businesses and services in their neighborhood, promoting local consumption and facilitating an ecosystem of exchange and collaboration."
    },
    servicestab:{
      service1: "Lawyers",
      icon1: "scale-balance",
      service2: "Community",
      icon2: "account-group-outline",
      service3: "Donations",
      icon3: "hand-heart",
      service4: "Events",
      icon4: "calendar-clock",
      service5: "Stores",
      icon5: "shopping-search",
      service6: "Entrepreneurs",
      icon6: "lightbulb-multiple-outline",
      help_question: "How can we help you today?"
    },
    lawyerstab: {
      label: "Specialties",
      practiceAreas: ['All' , 'Family' , 'Criminal', 'Immigration', 'Accidents'],
      //practiceAreas: "all",
      messagezip: "ZIP Code",
      validatezip: "ZIP not found.",
      resultone: "Result found",
      resultdomore: "Results found",
      viewallresults: "View all results",
      zipnofound:"ZIP not found.",
      noReviews: "There are no reviews yet.", // <--- Agrega esta
      addReview: "Give us your opinion",    // <--- Agrega esta
      placeholderReview: "Write about your experience...", // <--- Agrega esta
      publishBtn: "Post review",      // <--- Agrega esta
      typeReview: "Write my review",
      experience:"How was your experience?",
      backBtn: "Go back",
      recent: "Recent"
    },
    communitytab: {
      labeltypepost: "Post type",
      typepost : ['All', 'Experience', 'Question', 'Advice'],
      typepostAdd : ['Experience', 'Question', 'Advice'],
      messagenewpost: "New post",
      closepost: "Close",
      botonpost: "Post",
      firtscomment: "Be the first to comment",
      questionnewpost: 'What do you want to share?',
      textInappropriateTittle: "Inappropriate content",
      textInappropriateDescription: "Your post contains forbidden words. Please use respectful language.",
      imageInappropriateTittle: "Image rejected",
      imageInappropriateDescription: "Our AI detected sensitive content. Please choose another image.",
      publishedPostLabel: "Success!",
      publishedPostDescription: "Your post has been published.",
      errorServer: "Could not connect to the moderation server.",
      category: "Category",
      subCategories: ['General','Food','Work','Procedures','Health','New'],
      filter:"Filter",
      placeHolderModal: "Write something...",
      sendbutton: "Send",
      responsebutton: "Reply",
      messageNewPost:"What are you thinking?"
    },
    donationstab: {
        category: "Categories",
        subCategories: ['All','Clothing','Food','Furniture','Electronics','Other'],
        messageMessageDonation: "New donation",
        messageDonation: "What would you like to donate or need?",
        closeDonation: "Close",
        botonDonation: "Post",
        statusBottonModalDis: "Availables",
        statusBottonModalDel: "Delivered",
        statusDonatioAct: "Delivered",
        statusDonatioReact: "Reactivate",
        newdonnationTittle: "Donation title",
        newdonnationdescription: "Briefly describe the condition",
        textInappropriateTittle: "Inappropriate content",
        textInappropriateDescription: "Your post contains forbidden words. Please use respectful language.",
        imageInappropriateTittle: "Image rejected",
        imageInappropriateDescription: "Our AI detected sensitive content. Please choose another image.",
        publishedDonationLabel: "Success!",
        publishedDonationDescription: "Your post has been published.",
        errorServer: "Could not connect to the moderation server.",
        sendbutton: "Send",
        messagenotdonnations:"No available donations found.",
        choisephoto:"Select photo",
        callbton: "Call",
        typeContact: "Contact method"
      },
      eventstab: {
        label: "Events",
        filter: "Filters",
        botonEvent: "Post event",
        photoEvent :"Event photo",
        typeEvent: "Event type",
        dateEvent: "Event date",
        timeEvent: "Schedule (Start - End)",
        readyBtn: "Ready",
        nameEvent: "Event name",
        addressEvent: "Event address",
        detailsEvent: "Event details",
        sharringEvent: "Share event",
        createEvent: "Create event"
      }
  }
};