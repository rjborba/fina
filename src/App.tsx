import { Navbar } from "./Navbar";
import { ThemeProvider } from "./components/themeProvidex";
import { TooltipProvider } from "./components/ui/tooltip";
import { RootLayout } from "./layouts/RootLayout";
import Bills from "./pages/Bills";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
// import { Sidebar } from "./Sidebar";

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
    <>
      <ToastContainer theme="dark" position="bottom-center" />
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider delayDuration={200}>
          <div
            className="grid h-lvh w-full gap-x-2"
            style={{
              gridTemplateAreas: `"sidebar content"`,
              gridAutoColumns: "auto 1fr",
            }}
          >
            <div
              className="h-full bg-secondary"
              style={{ gridArea: "sidebar" }}
            >
              <Navbar />
            </div>
            <div className="overflow-hidden" style={{ gridArea: "content" }}>
              <RouterProvider router={router} />
            </div>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </>
  );
}

export default App;
