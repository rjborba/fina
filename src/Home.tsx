import { Navigate } from "react-router";

function Home() {
  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-auto">
          <Navigate to="/transactions" />
        </main>
      </div>
    </div>
  );
}

export default Home;
