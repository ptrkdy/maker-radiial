import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "select";
  options?: { label: string; value: string }[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}

interface FormProps {
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function Form({ fields, onSubmit, onCancel, submitLabel = "Submit" }: FormProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    fields.reduce(
      (acc, field) => ({
        ...acc,
        [field.name]: field.defaultValue || "",
      }),
      {}
    )
  );
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(true);

  const activeField = fields[activeFieldIndex];
  const isLastField = activeFieldIndex === fields.length - 1;

  useInput((input, key) => {
    if (key.escape && onCancel) {
      onCancel();
      return;
    }

    if (!isEditing) {
      if (key.upArrow && activeFieldIndex > 0) {
        setActiveFieldIndex(activeFieldIndex - 1);
        setIsEditing(true);
      } else if (key.downArrow && !isLastField) {
        setActiveFieldIndex(activeFieldIndex + 1);
        setIsEditing(true);
      } else if (key.return) {
        if (isLastField) {
          onSubmit(values);
        } else {
          setActiveFieldIndex(activeFieldIndex + 1);
          setIsEditing(true);
        }
      }
    }
  });

  const handleTextSubmit = (value: string) => {
    setValues((prev) => ({ ...prev, [activeField.name]: value }));
    setIsEditing(false);
  };

  const handleSelectChange = (item: { label: string; value: string }) => {
    setValues((prev) => ({ ...prev, [activeField.name]: item.value }));
    setIsEditing(false);
  };

  return (
    <Box flexDirection="column" gap={1}>
      {fields.map((field, index) => (
        <Box key={field.name} flexDirection="column">
          <Box gap={1}>
            <Text color={index === activeFieldIndex ? "cyan" : "gray"}>
              {index === activeFieldIndex ? "›" : " "}
            </Text>
            <Text color={index === activeFieldIndex ? "white" : "gray"}>
              {field.label}
              {field.required && <Text color="red">*</Text>}:
            </Text>
          </Box>
          <Box marginLeft={3}>
            {index === activeFieldIndex && isEditing ? (
              field.type === "select" && field.options ? (
                <SelectInput
                  items={field.options}
                  onSelect={handleSelectChange}
                />
              ) : (
                <TextInput
                  value={values[field.name] || ""}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, [field.name]: value }))
                  }
                  onSubmit={handleTextSubmit}
                  placeholder={field.placeholder}
                />
              )
            ) : (
              <Text color="gray">
                {values[field.name] || field.placeholder || "(empty)"}
              </Text>
            )}
          </Box>
        </Box>
      ))}
      <Box marginTop={1} gap={2}>
        <Text color="gray">
          [Enter] {isLastField ? submitLabel : "Next"} | [Esc] Cancel | [↑↓] Navigate
        </Text>
      </Box>
    </Box>
  );
}
