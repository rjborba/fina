import { ThemeProvider } from "./components/themeProvidex";
import { RootLayout } from "./layouts/RootLayout";
import Bills from "./pages/Bills";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <Bills />,
      },
    ],
  },
]);

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
