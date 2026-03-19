import { StyleSheet, Platform, ViewStyle, TextStyle } from 'react-native';

// Definimos una interfaz para los colores según el tema
interface ThemeColors {
  background: string;
  cardBg: string;
  text: string;
  subtext: string;
  border: string;
  inputBg: string;
  chipInactive: string;
}

export const getContentCardStyles = (isDark: boolean) => {
  // Configuración de colores dinámica
  const theme: ThemeColors = {
    background: isDark ? '#0f0c29' : '#f7f8fa',
    cardBg: isDark ?  'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.1)',
    text: isDark ? '#ffffff' : '#000000',
    subtext: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
    chipInactive: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  };

  return StyleSheet.create({
    container: { 
      flex: 1,
      backgroundColor: theme.background 
    },
    scrollContainer: { 
      flexGrow: 1, 
      paddingVertical: 20, 
      marginTop: Platform.OS === 'ios' ? -19 : 10 
    },
    centerContainer: { 
      width: '100%', 
      alignItems: 'center', 
      justifyContent: 'center', 
      flex: 1 
    },
    cardWrapper: {
      borderRadius: 40,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      ...Platform.select({
        ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 20 },
        android: { elevation: 12 },
      }),
    } as ViewStyle,
    cardContent: { 
      flex: 1, 
      padding: 25, 
      zIndex: 10  
    },
    headerRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: 3 
    },
    headerIcons: { 
      flexDirection: 'row', 
      alignItems: 'center' 
    },
    customInput: { 
      height: 48, 
      borderWidth: 1, 
      borderRadius: 14, 
      paddingHorizontal: 15,
      borderColor: theme.border,
      backgroundColor: theme.inputBg,
      color: theme.text
    },
    chip: { 
      paddingHorizontal: 12, 
      paddingVertical: 8, 
      borderRadius: 12, 
      borderWidth: 1, 
      marginRight: 8, 
      borderColor: theme.border,
      backgroundColor: theme.chipInactive
    },
    chipText: { 
      fontSize: 13, 
      fontWeight: '600',
      color: theme.text 
    },
    lawyerCard: { 
      flexDirection: 'row', 
      padding: 12, 
      borderRadius: 20, 
      alignItems: 'center', 
      marginBottom: 10,
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.border
    },
    smallText: { 
      fontSize: 12, 
      marginLeft: 4, 
      fontWeight: '600',
      color: theme.subtext 
    },
    // Añadimos exportación por defecto para evitar el error de Expo Router
    formContainer: { marginBottom: 4 },
    searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
    compactSearchBtn: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden' },
    gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    chipsScroll: { flexDirection: 'row', marginBottom: 5 },
    mapContainer: { height: 180, borderRadius: 15, overflow: 'hidden', marginVertical: 1, backgroundColor: theme.chipInactive },
    map: { ...StyleSheet.absoluteFillObject },
    zoomControls: { position: 'absolute', right: 10, bottom: 10, gap: 8 },
    zoomBtn: { backgroundColor: isDark ? '#333' : 'white', borderRadius: 10, width: 34, height: 34, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    resultsWrapper: { marginTop: 8 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    ratingDistRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    actionGroup: { flexDirection: 'row', gap: 6 },
    actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.chipInactive }
  });
};

// Exportación por defecto para satisfacer a Expo Router
export default function DummyComponent() { return null; }