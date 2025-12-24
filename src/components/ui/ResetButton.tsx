import React from "react";
import ResetIcon from "../icons/ResetIcon";
import { Button, ButtonProps } from "./Button";


export const ResetButton: React.FC<ButtonProps> = React.memo(
  ({ onClick, disabled = false, children, ...rest }) => (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children ?? <ResetIcon width={28} height={28} />}
    </Button>
  ),
);
