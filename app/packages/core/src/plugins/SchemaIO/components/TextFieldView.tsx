import { TextField } from "@mui/material";
import React from "react";
import { useKey } from "../hooks";
import { getComponentProps } from "../utils";
import autoFocus from "../utils/auto-focus";
import FieldWrapper from "./FieldWrapper";

export default function TextFieldView(props) {
  const { schema, onChange, path, data } = props;
  const { type, view = {} } = schema;

  const [key, setUserChanged] = useKey(path, schema);

  return (
    <FieldWrapper {...props}>
      <TextField
        key={key}
        disabled={view.readOnly}
        autoFocus={autoFocus(props)}
        defaultValue={data ?? schema.default}
        size="small"
        fullWidth
        placeholder={view.placeholder}
        type={type}
        onChange={(e) => {
          const value = e.target.value;
          onChange(path, type === "number" ? parseFloat(value) : value);
          setUserChanged();
        }}
        {...getComponentProps(props, "field")}
      />
    </FieldWrapper>
  );
}
