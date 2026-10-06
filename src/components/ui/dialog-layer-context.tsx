"use client"

import * as React from "react"

const DialogLayerContext = React.createContext(false)

function DialogLayerProvider({ children }: { children: React.ReactNode }) {
  return <DialogLayerContext.Provider value>{children}</DialogLayerContext.Provider>
}

function useDialogLayer() {
  return React.useContext(DialogLayerContext)
}

export { DialogLayerProvider, useDialogLayer }
