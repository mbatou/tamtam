import { useState, useEffect, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import { t as translations, Lang } from '@/constants/translations'

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    SecureStore.getItemAsync('app_lang').then(stored => {
      if (stored === 'fr' || stored === 'en') setLangState(stored)
    })
  }, [])

  const setLang = useCallback(async (newLang: Lang) => {
    setLangState(newLang)
    await SecureStore.setItemAsync('app_lang', newLang)
  }, [])

  return { t: translations[lang], lang, setLang }
}
