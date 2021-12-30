interface StorageExtension {
  getItem: <T>(key: string, defaultValue: T) => T
  setItem: <T>(key: string, value: T) => void
}

export const persistentStorage: StorageExtension = {
  getItem: (key, defaultValue) => {
    if (localStorage.getItem(key) === null) {
      persistentStorage.setItem(key, defaultValue)
    }
    return JSON.parse(localStorage.getItem(key)!)
  },
  setItem: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value))
  },
}

export const urlParamStorage: StorageExtension = {
  getItem: (key, defaultValue) => {
    const url = new URL(window.location.href)
    if (url.searchParams.has(key)) {
      return JSON.parse(url.searchParams.get(key)!)
    } else {
      urlParamStorage.setItem(key, defaultValue)
      return defaultValue
    }
  },
  setItem: (key, value) => {
    const url = new URL(window.location.href)
    if (value === undefined) {
      url.searchParams.delete(key)
    } else {
      url.searchParams.set(key, JSON.stringify(value))
    }
    window.history.replaceState(window.history.state, "", url.toString())
  },
}
