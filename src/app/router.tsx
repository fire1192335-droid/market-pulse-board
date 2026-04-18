import { createBrowserRouter } from "react-router-dom";

import { App } from "./App";
import { Dashboard } from "../pages/Dashboard";
import { StockDetail } from "../pages/StockDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "stock/:symbol",
        element: <StockDetail />,
      },
    ],
  },
]);
