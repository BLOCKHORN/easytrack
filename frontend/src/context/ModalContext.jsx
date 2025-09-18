// src/context/ModalContext.jsx
import { createContext, useContext, useState } from 'react'

const ModalContext = createContext()

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null) // 'login' | 'register' | null

  const openLogin = () => setModal('login')
  const openRegister = () => setModal('register')
  const closeModal = () => setModal(null)

  return (
    <ModalContext.Provider value={{ modal, openLogin, openRegister, closeModal }}>
      {children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  return useContext(ModalContext)
}
