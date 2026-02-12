// hooks/useTranslation.ts
import { useMockSelector } from '../redux/slices'; // Usa tus hooks de Redux
import { translations } from '../constants/Languages';

export const useTranslation = () => {
  const code = useMockSelector((state) => state.language.code);
  
  // Retornamos el objeto de traducción según el idioma actual
  const t = translations[code as keyof typeof translations] || translations.es;
  
  return { t, code };
};