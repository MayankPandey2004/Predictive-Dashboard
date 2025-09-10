import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { api } from './state/api.ts'
import { mlApi } from './state/mlApi.ts'

export const store = configureStore({
  reducer: {[api.reducerPath]: api.reducer, [mlApi.reducerPath]: mlApi.reducer,},
  middleware: (getDefault) => getDefault().concat(api.middleware).concat(mlApi.middleware),

})
setupListeners(store.dispatch)

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
  </Provider>,
)
