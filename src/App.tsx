import { Accounts } from "./Accounts/Accounts";
import { Categories } from "./Categories/Categories";
import { Import } from "./Import";
import { ImportList } from "./ImportList/ImportList";

function App() {
  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex flex-col gap-8">
            <Accounts />
            <Categories />
            <ImportList />
            <Import />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
