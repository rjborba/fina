import { Accounts } from "./Accounts/Accounts";
import { Categories } from "./Categories/Categories";
import { Import } from "./Import";
import { ImportList } from "./ImportList/ImportList";

function App() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <Accounts />
      <Categories />

      <ImportList />
      <Import />
    </div>
  );
}

export default App;
