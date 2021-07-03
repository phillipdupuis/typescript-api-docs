import React from "react"
import {
  Button,
  Stack,
  Checkbox,
  CheckboxProps,
  FormControl,
  FormLabel,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  NumberInput,
  NumberInputProps,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useDisclosure,
} from "@chakra-ui/react"
import { SiTypescript } from "react-icons/si"
import { usePrettier, PrettierOptions } from "src/prettier"

type BooleanOptions =
  | "semi"
  | "singleQuote"
  | "bracketSpacing"
  | "useTabs"
  | "removeComments"
type NumericOptions = "tabWidth" | "printWidth"

const DEFAULTS: PrettierOptions = {
  semi: true,
  singleQuote: false,
  bracketSpacing: false,
  useTabs: false,
  tabWidth: 2,
  printWidth: 80,
  removeComments: false,
}

const LABELS: Record<keyof PrettierOptions, string> = {
  semi: "Print semicolons at the ends of statements",
  singleQuote: "Use single quotes instead of double quotes",
  bracketSpacing: "Print spaces between brackets in object literals",
  useTabs: "Indent lines with tabs instead of spaces",
  tabWidth: "Tab width",
  printWidth: "Print width",
  removeComments: "Remove comments",
}

type FieldProps<T, F extends keyof PrettierOptions> = T & { field: F }

type Field<T, F extends keyof PrettierOptions> = React.ReactElement<
  FieldProps<T, F>
>

const BooleanField = <T extends BooleanOptions>({
  field,
  ...props
}: FieldProps<CheckboxProps, T>): Field<CheckboxProps, T> => {
  const { options, setOptions } = usePrettier()
  return (
    <Checkbox
      {...props}
      size="md"
      isChecked={options[field] ?? DEFAULTS[field]}
      onChange={(e) =>
        setOptions((previous) => ({ ...previous, [field]: e.target.checked }))
      }
    >
      {LABELS[field]}
    </Checkbox>
  )
}

const NumberField = <T extends NumericOptions>({
  field,
  ...props
}: FieldProps<NumberInputProps, T>): Field<NumberInputProps, T> => {
  const { options, setOptions } = usePrettier()
  return (
    <>
      <FormLabel htmlFor={`prettier-${field}`} gridColumn={1} my="auto">
        {LABELS[field]}
      </FormLabel>
      <NumberInput
        {...props}
        id={`prettier-${field}`}
        size="sm"
        gridColumn={2}
        defaultValue={options[field] ?? DEFAULTS[field]}
        onChange={(v) => {
          if (v !== "") {
            setOptions((previous) => ({ ...previous, [field]: parseInt(v) }))
          }
        }}
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </>
  )
}

export const PrettierOptionsManager: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <>
      <Button
        isFullWidth
        size="md"
        onClick={onOpen}
        aria-label="Edit typescript formatting options"
        leftIcon={<SiTypescript />}
      >
        Formatting options
      </Button>
      <Drawer size="md" isOpen={isOpen} onClose={onClose} placement="right">
        <DrawerOverlay />
        <DrawerContent w="fit-content">
          <DrawerCloseButton />
          <DrawerHeader>Typescript Formatting Options</DrawerHeader>
          <DrawerBody>
            <Stack shouldWrapChildren w="fit-content" direction="column">
              <BooleanField field="removeComments" />
              <BooleanField field="semi" />
              <BooleanField field="singleQuote" />
              <BooleanField field="bracketSpacing" />
              <BooleanField field="useTabs" />
              <FormControl
                as="fieldset"
                display="grid"
                gridTemplateColumns="fit-content 1fr"
                gridGap={2}
                my="1"
              >
                <NumberField field="tabWidth" min={0} max={20} />
                <NumberField field="printWidth" min={10} max={1000} />
              </FormControl>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}
