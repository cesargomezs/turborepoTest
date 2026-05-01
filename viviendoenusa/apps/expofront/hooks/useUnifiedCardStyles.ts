import { StyleSheet, Platform, useColorScheme, useWindowDimensions } from 'react-native';
import { useMockSelector } from '@/redux/slices';

export const useUnifiedCardStyles = () => {
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'light' ? false : true; // Aseguramos que cualquier valor distinto a 'light' se trate como 'dark'
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);

  // --- LÓGICA DE DIMENSIONES Y PLATAFORMA ---
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  const isLargeWeb = isWeb && width > 1000;

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  // --- PALETA DE COLORES DINÁMICA ---
  const glassColors = {
    cardBg: isDark ? 'rgba(30, 30, 30, 0.94)' : 'rgba(255, 255, 255, 0.94)',
    inputBg: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(245, 245, 245, 0.8)',
    itemBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    border: isDark ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.15)',
    text: isDark ? '#FFF' : '#1A1A1A',
    textButton: isDark ? '#1A1A1A' : '#FFFFFF',
    subtext: isDark ? '#A0A0A0' : '#1A1A1A',
    accent: '#FF5F6D',
    accentLight: 'rgba(255, 95, 109, 0.15)',
    reactionBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
  };

  const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { 
      width: '100%', 
      alignItems: 'center', 
      justifyContent: 'center', 
      flex: 1,
      marginTop: verticalOffset 
    },
    unifiedCardWrapper: {
      width: cardWidth,
      height: cardHeight,
      borderRadius: 28,
      borderWidth: 1.5,
      borderColor: glassColors.border,
      overflow: 'hidden',
      backgroundColor: isAndroid ? glassColors.cardBg : (isWeb ? (isDark ? '#141414' : '#FFFFFF') : 'transparent'),
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowRadius: 20,
    },
    headerRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: 5,
      width: '100%'
    },
    cardContent: { 
      flex: 1, 
      padding: isWeb ? 35 : 25, 
      zIndex: 10 
    },
    // --- SERVICIOS ---
    welcomeText: { fontSize: 30, fontWeight: '900', letterSpacing: -1, color: glassColors.text },
    middleText: { fontSize: 16, fontWeight: '600', opacity: 0.8, color: glassColors.text },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
    webGridCentering: { justifyContent: 'center', gap: 20 },
    mobileCard: { width: '47%', height: 110, marginBottom: 16 },
    webCard: { width: '31%', height: 105, marginBottom: 20, minWidth: 260 },
    shadowWrapper: {
      borderRadius: 24,
      ...Platform.select({ 
          ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, 
          android: { elevation: 3 },
          web: { cursor: 'pointer' } as any
      })
    },
    gradientButton: { flex: 1, borderRadius: 24, padding: 12, justifyContent: 'center' },
    mobileLayout: { alignItems: 'center', justifyContent: 'center' },
    webLayout: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
    textContainerMobile: { alignItems: 'center', marginTop: 8 },
    textContainerWeb: { marginLeft: 15, flex: 1, justifyContent: 'center' },
    buttonText: { fontSize: 13, color: 'white', fontWeight: '800' },
    descriptionText: { color: 'white', fontSize: 11, opacity: 0.85, marginTop: 2, fontWeight: '400' },
    iconContainerWeb: { backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: 8, borderRadius: 12 },

    // --- COMUNIDAD ---
    postCard: { 
      backgroundColor: glassColors.itemBg, 
      borderRadius: 22, 
      padding: 18, 
      marginBottom: 15, 
      borderWidth: 1,
      borderColor: glassColors.border
    },
    postHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    tagText: { fontSize: 9, color: glassColors.accent, fontWeight: 'bold', textTransform: 'uppercase' },
    timeText: { fontSize: 9, color: glassColors.subtext, opacity: 0.6 },
    bodyText: { fontSize: 14, marginBottom: 12, lineHeight: 20, color: glassColors.text },
    postImage: { width: '100%', height: 180, borderRadius: 18, marginBottom: 12, resizeMode: 'cover' },
    postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    commentSection: { 
      marginTop: 10, borderTopWidth: 0.5, borderColor: glassColors.border, 
      paddingTop: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', 
      borderRadius: 10, padding: 10 
    },
    commentBubble: { marginBottom: 6 },
    commentUser: { fontSize: 11, fontWeight: 'bold', color: glassColors.accent },
    commentText: { fontWeight: 'normal', fontSize: 11, color: glassColors.text },
    noCommentsText: { fontSize: 10, color: glassColors.subtext, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 },
    replyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    replyBtnText: { color: glassColors.accent, fontSize: 10, marginLeft: 5, fontWeight: 'bold' },
    reaccionGroup: { flexDirection: 'row', gap: 8 },
    reaccionBtn: { 
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, 
      paddingVertical: 5, borderRadius: 18, backgroundColor: glassColors.reactionBg
    },
    reaccionCount: { fontSize: 11, marginLeft: 5, fontWeight: '700', color: glassColors.text },

    // --- FILTROS Y CHIPS ---
    headerSubChip: { 
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, 
      borderRadius: 20, borderWidth: 1, borderColor: glassColors.border, marginRight: 8 
    },
    filterChipBase: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
      paddingHorizontal: 14, height: 32, borderRadius: 16, borderWidth: 1, borderColor: glassColors.border
    },
    filterChipText: { fontSize: 11, fontWeight: '600', color: glassColors.text },
    subFilterChip: { 
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, 
      borderRadius: 12, borderWidth: 1, borderColor: glassColors.border, marginRight: 8 
    },
    subChipText: { fontSize: 11, fontWeight: 'bold', marginLeft: 6, color: glassColors.text },
    tagChip: { 
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, 
      borderRadius: 15, marginRight: 8, backgroundColor: glassColors.itemBg, 
      borderWidth: 1, borderColor: glassColors.border, justifyContent: 'center' 
    },
    subChip: { 
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 28, 
      borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: 'transparent', 
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' 
    },

    // --- WEB SIDEBAR ---
    webSidebar: { width: 240, borderRightWidth: 1, borderColor: glassColors.border, paddingRight: 20 },
    sideMenuTitle: { 
      fontSize: 12, fontWeight: '800', marginBottom: 20, letterSpacing: 1.2, 
      textTransform: 'uppercase', color: glassColors.text
    },
    webCapsuleBtn: { 
      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, marginBottom: 10, 
      flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'transparent'
    },
    webCapsuleText: { fontSize: 14, fontWeight: '700', color: glassColors.textButton },

    // --- MODALES ---
    modalBlur: { borderTopLeftRadius: 35, borderTopRightRadius: 35, overflow: 'hidden' },
    modalContent: { padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: glassColors.text },
    label: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, opacity: 0.6, color: glassColors.text },
    postInput: { minHeight: 120, fontSize: 16, textAlignVertical: 'top', marginVertical: 15, color: glassColors.text },
    publishBtn: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
    previewContainer: { width: 80, height: 80, borderRadius: 12, marginBottom: 15, position: 'relative' },
    previewImg: { width: '100%', height: '100%', borderRadius: 12 },
    removeImg: { position: 'absolute', top: -5, right: -5, backgroundColor: isDark ? '#333' : '#fff', borderRadius: 10 },
    actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fab: { position: 'absolute', bottom: 65, right: 30, width: 64, height: 64, borderRadius: 32, elevation: 8, zIndex: 10 },
    closeViewerBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 8 },
    closeViewerBtnright: { position: 'absolute', top: -15, left: 90, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 8 }
  });

  return {
    ...styles,
    isLargeWeb,
    isDark,
    borderColor: glassColors.border,
    cardWidth,
    cardHeight
  };
};