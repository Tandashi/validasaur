import type {
  ValidationErrors,
  RawValidationResult,
  InputData,
  InvalidParams,
} from "../src/interfaces.ts";
import * as utils from "../src/utils.ts";
import { assertEquals } from "./deps.ts";
import { required, isNumber, isInt, isIn, nullable } from "../src/rules.ts";

const sampleErrorMessages = (): ValidationErrors => ({
  x: {
    rule1: "something wrong with x.rule1",
    rule2: "something wrong with x.rule2",
  },
  obj: {
    validateObject: {
      x: {
        rule1: "something wrong with obj.x.rule1",
        rule2: "something wrong with obj.x.rule2",
      },
    },
  },
  arr: {
    validateArray: {
      "1": {
        rule1: "something wrong with arr[1].rule1",
        rule2: "something wrong with arr[1].rule2",
      },
    },
  },
  arrObj: {
    validateArray: {
      "1": {
        validateObject: {
          x: {
            rule1: "something wrong with arrObj[1].x.rule1",
            rule2: "something wrong with arrObj[1].x.rule2",
          },
        },
      },
    },
  },
});

Deno.test("utils.invalid()", () => {
  assertEquals(utils.invalid("foo", { x: 10, y: "bar" }, true), {
    rule: "foo",
    params: {
      x: 10,
      y: "bar",
    },
    implicit: true,
  });
});

Deno.test("utils.isNullable()", () => {
  assertEquals(
    utils.isNullable([required, nullable, isNumber, isInt, isIn([1, 2, 3])]),
    true,
    `isNullable should be true when there is nullable rule`
  );
  assertEquals(
    utils.isNullable([required, isNumber, isInt, isIn([1, 2, 3])]),
    false,
    `isNullable should be false when there is no nullable rule`
  );
});

Deno.test("utils.isOptional()", () => {
  assertEquals(
    utils.isOptional([isNumber, isInt, isIn([1, 2, 3])]),
    true,
    `isOptional should be true when there is no required rule`
  );
  assertEquals(
    utils.isOptional([required, isNumber, isInt, isIn([1, 2, 3])]),
    false,
    `isOptional should be false when there is required rule`
  );
});

Deno.test("utils.isOptionalValue()", () => {
  assertEquals(utils.isOptionalValue(null), true);
  assertEquals(utils.isOptionalValue(undefined), true);
  assertEquals(utils.isOptionalValue(""), true);
  assertEquals(utils.isOptionalValue(0), false);
  assertEquals(utils.isOptionalValue([]), false);
  assertEquals(utils.isOptionalValue({}), false);
});

Deno.test("utils.firstMessages()", () => {
  const errorMessages = sampleErrorMessages();
  const result = utils.firstMessages(errorMessages);

  assertEquals(result, {
    x: "something wrong with x.rule1",
    obj: {
      x: "something wrong with obj.x.rule1",
    },
    arr: {
      "1": "something wrong with arr[1].rule1",
    },
    arrObj: {
      "1": {
        x: "something wrong with arrObj[1].x.rule1",
      },
    },
  });
});

Deno.test("utils.flattenMessages()", () => {
  const errorMessages = sampleErrorMessages();
  const result = utils.flattenMessages(errorMessages);

  assertEquals(result, {
    "x.rule1": "something wrong with x.rule1",
    "x.rule2": "something wrong with x.rule2",
    x: "something wrong with x.rule1",
    "obj.x.rule1": "something wrong with obj.x.rule1",
    "obj.x.rule2": "something wrong with obj.x.rule2",
    "obj.x": "something wrong with obj.x.rule1",
    "arr.1.rule1": "something wrong with arr[1].rule1",
    "arr.1.rule2": "something wrong with arr[1].rule2",
    "arr.1": "something wrong with arr[1].rule1",
    "arrObj.1.x.rule1": "something wrong with arrObj[1].x.rule1",
    "arrObj.1.x.rule2": "something wrong with arrObj[1].x.rule2",
    "arrObj.1.x": "something wrong with arrObj[1].x.rule1",
  });
});

Deno.test("utils.findBestMessage()", () => {
  // Message templates sorted by priority
  const messageTemplates = {
    "x.rule1:stuff1": "x.rule1:stuff1 is invalid",
    "x.rule1": "x.rule1 is invalid",
    x: "x is invalid",
    "rule1:stuff1": "invalid rule1:stuff1",
    rule1: "invalid rule1",
  };
  const defaultMsg = "default message";

  assertEquals(
    utils.findBestMessage(
      messageTemplates,
      "x",
      "rule1:stuff1",
      "rule1",
      defaultMsg
    ),
    "x.rule1:stuff1 is invalid"
  );
  assertEquals(
    utils.findBestMessage(
      messageTemplates,
      "x",
      "rule1:stuffX",
      "rule1",
      defaultMsg
    ),
    "x.rule1 is invalid"
  );
  assertEquals(
    utils.findBestMessage(
      messageTemplates,
      "x",
      "ruleX:stuffY",
      "ruleX",
      defaultMsg
    ),
    "x is invalid"
  );
  assertEquals(
    utils.findBestMessage(
      messageTemplates,
      "y",
      "rule1:stuff1",
      "rule1",
      defaultMsg
    ),
    "invalid rule1:stuff1"
  );
  assertEquals(
    utils.findBestMessage(
      messageTemplates,
      "y",
      "rule1:stuffX",
      "rule1",
      defaultMsg
    ),
    "invalid rule1"
  );
  assertEquals(
    utils.findBestMessage(
      messageTemplates,
      "y",
      "ruleX:stuffY",
      "ruleX",
      defaultMsg
    ),
    defaultMsg
  );
});

Deno.test("utils.resolveErrorMessage()", () => {
  assertEquals(
    utils.resolveErrorMessage(
      ":attr can't be :value, it must be between :min-:max",
      { value: 10, min: 11, max: 15 },
      "x"
    ),
    "x can't be 10, it must be between 11-15"
  );
});

Deno.test("utils.resolveErrorMessages()", () => {
  const sampleRawErrors: RawValidationResult = {
    x: [
      {
        rule: "rule1",
        params: {},
        implicit: false,
      },
      {
        rule: "rule2",
        params: { a: 10 },
        implicit: false,
      },
    ],
    arr: [
      {
        rule: "validateArray",
        params: {
          errors: {
            "1": [
              {
                rule: "rule1",
                params: {},
                implicit: false,
              },
              {
                rule: "rule2",
                params: {},
                implicit: false,
              },
            ],
          },
        },
        implicit: true,
      },
    ],
    obj: [
      {
        rule: "validateObject",
        params: {
          errors: {
            x: [
              {
                rule: "rule1",
                params: {},
                implicit: false,
              },
              {
                rule: "rule2",
                params: {},
                implicit: false,
              },
            ],
          },
        },
        implicit: true,
      },
    ],
    arrObj: [
      {
        rule: "validateArray",
        params: {
          errors: {
            "1": [
              {
                rule: "validateObject",
                params: {
                  errors: {
                    x: [
                      {
                        rule: "rule1",
                        params: {},
                        implicit: false,
                      },
                      {
                        rule: "rule2",
                        params: {},
                        implicit: false,
                      },
                    ],
                  },
                },
                implicit: true,
              },
            ],
          },
        },
        implicit: true,
      },
    ],
  };

  const result = utils.resolveErrorMessages(sampleRawErrors, {
    messages: {
      rule1: "invalid rule1",
      rule2: "invalid rule2",
    },
  });

  assertEquals(result, {
    x: {
      rule1: "invalid rule1",
      rule2: "invalid rule2",
    },
    arr: {
      validateArray: {
        "1": {
          rule1: "invalid rule1",
          rule2: "invalid rule2",
        },
      },
    },
    obj: {
      validateObject: {
        x: {
          rule1: "invalid rule1",
          rule2: "invalid rule2",
        },
      },
    },
    arrObj: {
      validateArray: {
        "1": {
          validateObject: {
            x: {
              rule1: "invalid rule1",
              rule2: "invalid rule2",
            },
          },
        },
      },
    },
  });
});

Deno.test("utils.isStringInt", () => {
  assertEquals(utils.isStringInt("123"), true, "'123' should be string int");
  assertEquals(
    utils.isStringInt("12a"),
    false,
    "'12a' shouldn't be string int"
  );
  assertEquals(
    utils.isStringInt("a12"),
    false,
    "'a12' shouldn't be string int"
  );
  assertEquals(
    utils.isStringInt("12.5"),
    false,
    "'12.5' shouldn't be string int"
  );
  assertEquals(utils.isStringInt("0.1"), false, "'0.1' should't be string int");
  assertEquals(utils.isStringInt(".1"), false, "'.1' shouldn't be string int");
});

Deno.test("utils.getValue", () => {
  const data: InputData = {
    str: "foo",
    obj: {
      str: "bar",
    },
    num: 12,
    empty: null,
    arrObj: [
      {
        str: "baz",
      },
      {
        str: "qux",
      },
    ],
  };

  assertEquals(utils.getValue(data, "str"), "foo", "data.str shouldbe 'foo'");
  assertEquals(
    utils.getValue(data, "obj"),
    { str: "bar" },
    "data.obj should be {str: 'bar'}"
  );
  assertEquals(
    utils.getValue(data, "obj.str"),
    "bar",
    "data.obj.str should be 'bar'"
  );
  assertEquals(
    utils.getValue(data, "obj.nothing"),
    undefined,
    "data.obj.nothing should be undefined"
  );
  assertEquals(
    utils.getValue(data, "obj.1.x"),
    undefined,
    "data.1.x should be undefined"
  );
  assertEquals(utils.getValue(data, "num"), 12, "data.num should be 12");
  assertEquals(
    utils.getValue(data, "num.nothing"),
    undefined,
    "data.num.nothing should be undefined"
  );
  assertEquals(
    utils.getValue(data, "empty"),
    null,
    "data.empty should be null"
  );
  assertEquals(
    utils.getValue(data, "empty.nothing"),
    undefined,
    "data.empty.nothing should be undefined"
  );
  assertEquals(
    utils.getValue(data, "arrObj.0"),
    { str: "baz" },
    "arrObj.0 should be {str: 'baz'}"
  );
  assertEquals(
    utils.getValue(data, "arrObj.0.str"),
    "baz",
    "arrObj.0.str should be 'baz'"
  );
  assertEquals(
    utils.getValue(data, "arrObj.1"),
    { str: "qux" },
    "arrObj.1 should be {str: 'qux'}"
  );
  assertEquals(
    utils.getValue(data, "arrObj.1.str"),
    "qux",
    "arrObj.1.str should be 'qux'"
  );
  assertEquals(
    utils.getValue(data, "arrObj.nothing"),
    undefined,
    "arrObj.nothing should be undefined"
  );
  assertEquals(
    utils.getValue(data, "arrObj.2"),
    undefined,
    "arrObj.2 should be undefined"
  );
});

Deno.test("utils.getCheckType", () => {
  assertEquals(utils.getCheckType("foo"), "");
  assertEquals(utils.getCheckType("foo:bar"), "bar");
  assertEquals(utils.getCheckType("foo:barBaz"), "barBaz");
  assertEquals(utils.getCheckType("foo:barBaz:qux"), "barBaz:qux");
});

Deno.test("utils.resolveErrorMessage() with MessageFunction", () => {
  const message = (params: InvalidParams, checkType?: string): string => {
    switch (checkType) {
      case "numberCheck":
        return `Value must be a number, ${typeof params.value} given`;
      default:
        return `${params.attr} can't be ${params.value}, it must be between ${params.min}-${params.max}`;
    }
  };

  assertEquals(
    utils.resolveErrorMessage(message, { value: 10, min: 11, max: 15 }, "x"),
    "x can't be 10, it must be between 11-15"
  );

  assertEquals(
    utils.resolveErrorMessage(message, { value: "10" }, "x", "numberCheck"),
    "Value must be a number, string given"
  );
});

Deno.test("utils.clearTimes()", () => {
  const input = new Date("2020-12-25 20:30:40:50");
  const expect = new Date("2020-12-25 00:00:00:00");
  assertEquals(utils.clearTimes(input), expect);
});
