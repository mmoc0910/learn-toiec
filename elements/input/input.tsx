import { input } from "framer-motion/client";
import { useController, type UseControllerProps } from "react-hook-form";
import { cn } from "utils/helpers/class-name";

type Props = {
  label?: string;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  containerClassName?: string;
  inputClassName?: string;
} & UseControllerProps;
export function Input({
  label,
  placeholder,
  type = "text",
  containerClassName,
  inputClassName,
  ...props
}: Props) {
  const {
    field,
    fieldState: { error },
  } = useController(props);

  const renderLabel = () => {
    if (!label) return;
    return (
      <label htmlFor={props.name} className="block text-sm font-medium">
        {label}
        {props.rules?.required && (
          <span className="text-red-700 font-bold text-xl">*</span>
        )}
      </label>
    );
  };
  const renderError = () => {
    if (!error) return;
    return <p className="text-red-700 text-xs">{error?.message}</p>;
  };
  return (
    <div className={cn("flex flex-col flex-1", containerClassName)}>
      {renderLabel()}
      <input
        className={cn(
          "outline-none border border-[#e0e0e0] px-4 py-2 rounded-xl placeholder:text-slate-600 bg-white focus:ring-4 focus:ring-violet-100",
          inputClassName
        )}
        placeholder={placeholder}
        type={type}
        {...field}
      />
      {renderError()}
    </div>
  );
}
