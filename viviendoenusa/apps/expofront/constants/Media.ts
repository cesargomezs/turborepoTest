import { StyleSheet } from 'react-native';

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
    // Estilo para el TabBar (el menú de abajo)
    tabBar: {
      maxWidth: 768,
      alignSelf: 'center',
      width: '90%', // Un poco más estrecho para que flote como en la imagen
      bottom: 20,
      borderRadius: 30,
      height: 65,
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
    }
  }),
};



