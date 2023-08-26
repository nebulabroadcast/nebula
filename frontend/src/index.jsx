import React from 'react'
import { createRoot } from 'react-dom/client'
import { configureStore } from '@reduxjs/toolkit'
import { Provider as ReduxProvider } from 'react-redux'
import { ToastContainer, Flip } from 'react-toastify'

import App from './app'

import contextReducer from './actions'

import 'react-toastify/dist/ReactToastify.css'
import 'material-symbols'
import './index.sass'

const store = configureStore({
  reducer: {
    context: contextReducer,
  },
})

document.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.getElementById('root'))
  root.render(
    <React.StrictMode>
      <ReduxProvider store={store}>
        <App />
        <ToastContainer
          position="bottom-right"
          transition={Flip}
          theme="dark"
          pauseOnFocusLoss={false}
          newestOnTop={true}
          draggable={false}
          closeOnClick={true}
          autoClose={3000}
          limit={5}
        />
      </ReduxProvider>
    </React.StrictMode>
  )
})
