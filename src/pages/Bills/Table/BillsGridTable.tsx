import { EditableField } from "@/components/editableField";
import { TBill, useBills } from "@/hooks/Bills/useBills";
import { cn } from "@/lib/utils";
import {
  FC,
  useEffect,
  useRef,
  useState,
  MouseEvent,
  MouseEventHandler,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "react-toastify";

type TFormValues = TBill;
type TRowState = { isLoading: boolean; isError: boolean };
type TRow = { data: TFormValues; rowState: TRowState };

const formDefaultValues: TBill = {
  category: "",
  createdAt: "",
  description: "Description",
  id: 0,
  installment: null,
  purchasedAt: null,
  totalInstallments: null,
  value: 200,
};

const headers = ["id", "category", "description", "value"];
const colSpanTable = headers.length;

export const FormRows: FC<{
  bill: Partial<TBill>;
  cols: string[];
}> = ({ bill, cols }) => {
  const { mutate } = useBills();
  const useFormMethods = useForm<TFormValues>({
    defaultValues: formDefaultValues,
  });

  useEffect(() => {
    useFormMethods.reset(bill);

    return () => {};
  }, [useFormMethods, bill]);

  const onSubmit = (data: TFormValues) => {
    mutate.update.execute({ billId: data.id, bill: data }).then(() =>
      toast.success("Updated", {
        autoClose: 500,
        pauseOnFocusLoss: false,
        pauseOnHover: false,
      }),
    );
  };

  return (
    <div
      className={`grid grid-cols-subgrid transition-colors hover:bg-muted/50`}
      style={{ gridColumn: `span ${colSpanTable}` }}
    >
      <FormProvider {...useFormMethods}>
        <form
          className={`grid grid-cols-subgrid`}
          style={{ gridColumn: `span ${colSpanTable}` }}
          onSubmit={useFormMethods.handleSubmit(onSubmit)}
        >
          {cols.map((header, index) => (
            <div
              key={header}
              className={cn(
                "relative flex flex-grow justify-between overflow-hidden  px-2",
                // border-b-2 border-r-2
                // { "border-l-2": index === 0 },
              )}
            >
              {bill[header as keyof typeof bill] ? (
                <EditableField name={header} />
              ) : (
                "-"
              )}
            </div>
          ))}
        </form>
      </FormProvider>
    </div>
  );
};

export const BillsGridTable: FC = () => {
  const {
    response: { data },
  } = useBills();

  const tableWrapperRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   if (!tableWrapperRef.current) {
  //     return;
  //   }

  //   setSizes((old) => {
  //     return old.map((oldSize) => {
  //       return Math.floor(
  //         (tableWrapperRef.current!.clientWidth - 16) / old.length,
  //       );
  //     });
  //   });
  // }, [tableWrapperRef.current]);

  const [sizes, setSizes] = useState(headers.map(() => 160));

  const isDraggingRef = useRef(false);

  const onMouseDown = (
    e: MouseEvent<HTMLDivElement, globalThis.MouseEvent>,
    colIndex: number,
  ) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.classList.add("resizing-x");

    const onMouseMove = (e: globalThis.MouseEvent) => {
      if (isDraggingRef.current) {
        setSizes((old) => {
          const oldSizes = [...old];
          oldSizes[colIndex] = oldSizes[colIndex] + e.movementX;

          return oldSizes;
        });
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;

      setSizes((old) => {
        return old.map((oldSize) => Math.max(oldSize, 60));
      });
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.classList.remove("resizing-x");
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      className="overflow-x-auto rounded-xl border bg-card p-4 text-card-foreground"
      ref={tableWrapperRef}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: sizes
            .map((size) => Math.max(size, 60) + "px")
            .join(" "),
          // gridTemplateColumns: sizes.map((size) => "1fr").join(" "),
          gridTemplateRows: `repeat(${data?.length ? data?.length + 1 : 0}, minmax(48px, 48px))`,
        }}
      >
        <div
          className={`grid grid-cols-subgrid border-b`}
          style={{ gridColumn: `span ${colSpanTable}` }}
        >
          {/* Headers */}
          {headers.map((header, headerIndex) => {
            return (
              <div
                key={`header-${header}`}
                className="flex w-full items-center justify-between "
              >
                <div className="flex-shrink flex-grow overflow-hidden text-ellipsis whitespace-nowrap px-2">
                  {header}
                </div>
                {/* Resize Handler */}
                <div
                  className="flex h-full w-1 flex-shrink-0 cursor-ew-resize select-none items-center px-2"
                  onMouseDown={(e) => onMouseDown(e, headerIndex)}
                >
                  <div className="h-6  flex-shrink-0 border border-r-2 " />
                </div>
              </div>
            );
          })}
        </div>

        {data?.map((bill) => (
          <FormRows key={`form-row-${bill.id}`} bill={bill} cols={headers} />
        ))}
      </div>
    </div>
  );
};
