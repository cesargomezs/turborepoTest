import { StyleSheet, Platform } from 'react-native';

export const Media: {
  className: string;
  styles: ReturnType<typeof StyleSheet.create>;
} = {
  // Tailwind max width of "3xl" is 768px
  className: 'max-w-3xl mx-auto w-full',
  styles: StyleSheet.create({
    view: {
      maxWidth: 768,
      marginHorizontal: 'auto',
      width: '100%',
    },
    // Estilo adaptativo para el TabBar
    tabBar: {
      maxWidth: 768,
      alignSelf: 'center',
      
      // Ajustes por plataforma
      ...Platform.select({
        ios: {
          width: '90%',
          bottom: 20,
          borderRadius: 30,
          height: 65,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 10,
        },
        android: {
          width: '90%',
          bottom: 20,
          borderRadius: 30,
          height: 65,
          elevation: 5,
        },
        web: {
          // En Web, la barra suele ser plana al fondo y ocupar el ancho del contenedor
          width: '100%', 
          bottom: 0,
          borderRadius: 0, // O mantenerlo redondeado si prefieres el estilo "floating"
          height: 70,
          // Eliminamos elevación para un look más limpio o usamos border
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.05)',
        }
      }),
    }
  }),
};