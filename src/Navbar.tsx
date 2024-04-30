import { FC } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./components/ui/tooltip";
import {
  CircleFadingPlusIcon,
  ListIcon,
  PlusCircleIcon,
  ShoppingCart,
} from "lucide-react";

export const Navbar: FC = () => {
  return (
    <nav className="flex h-full flex-col items-center gap-4 border bg-background px-2 sm:py-5">
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <a
            href="#"
            className="flex h-12 w-12 items-center justify-center rounded-lg text-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
          >
            <PlusCircleIcon className="h-8 w-8" />
            <span className="sr-only">Entries</span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="right">Entries</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <a
            href="#"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
          >
            <ListIcon className="h-5 w-5" />
            <span className="sr-only">Entries</span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="right">Entries</TooltipContent>
      </Tooltip>
    </nav>
  );

  return (
    <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href="#"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="sr-only">Orders</span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="right">Orders</TooltipContent>
      </Tooltip>
    </nav>
  );
};
