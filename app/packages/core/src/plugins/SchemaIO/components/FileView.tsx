import { Box } from "@mui/material";
import React, { useCallback, useState } from "react";
import FileDrop from "./FileDrop";
import HeaderView from "./HeaderView";
import TabsView from "./TabsView";
import TextFieldView from "./TextFieldView";
import { getComponentProps } from "../utils";
import { useKey } from "../hooks";

export default function FileView(props) {
  const { data, onChange, path, schema, autoFocused } = props;
  const { view = {} } = schema;
  const { types, defaultMode } = view;
  const [type, setType] = useState(defaultMode);

  const [key, setUserChanged] = useKey(path, schema);

  const handleChange = useCallback(
    (data: string | null) => {
      onChange(path, data);
      if (data !== null) setUserChanged();
    },
    [onChange, path, setUserChanged]
  );

  return (
    <Box {...getComponentProps(props, "container")}>
      <HeaderView {...props} nested />
      <TabsView
        schema={{
          view: {
            choices: [
              { value: "file", label: "Upload" },
              { value: "url", label: "URL" },
            ],
          },
        }}
        onChange={(_: string, value: string) => {
          setType(value);
          handleChange(null);
        }}
        {...getComponentProps(props, "tabs")}
      />
      <Box sx={{ pt: 1 }} {...getComponentProps(props, "fileContainer")}>
        {type === "file" && (
          <FileDrop
            onChange={async (files) => {
              if (files?.length === 0) return handleChange(null);
              const [file] = files;
              const { error, result } = await fileToBase64(file);
              if (error) return; // todo: handle error
              if (result) handleChange(result);
            }}
            types={types}
            autoFocused={autoFocused}
            // allowMultiple={allowMultiple}
            {...getComponentProps(props, "fileDrop")}
          />
        )}
        {type === "url" && (
          <TextFieldView
            key={key}
            schema={{
              default: schema.default,
              view: { placeholder: "URL to a file" },
            }}
            onChange={(path: string, value: string) => {
              handleChange(value);
            }}
            path={path}
            data={data}
            {...getComponentProps(props, "fileURL")}
          />
        )}
      </Box>
    </Box>
  );
}

function fileToBase64(
  file: File
): Promise<{ result?: string; error?: ProgressEvent<EventTarget> }> {
  return new Promise((resolve) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    fileReader.onload = () => resolve({ result: fileReader.result as string });
    fileReader.onerror = (error) => resolve({ error });
  });
}
