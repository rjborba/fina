import { describe, expect, it } from "vitest";
import {
  CategoryOutputSchema,
  CreateCategoryInputDtoSchema,
  UpdateCategoryAppearanceInputDtoSchema
} from "../index";

describe("category contracts", () => {
  it("applies safe appearance defaults for older create clients", () => {
    expect(
      CreateCategoryInputDtoSchema.parse({ name: "Food", groupId: "1" })
    ).toEqual({
      name: "Food",
      icon: "tag",
      color: "yellow",
      groupId: "1"
    });
  });

  it("accepts supported category appearance values", () => {
    expect(
      CreateCategoryInputDtoSchema.parse({
        name: "Break",
        icon: "coffee",
        color: "rose",
        groupId: "1"
      })
    ).toEqual({
      name: "Break",
      icon: "coffee",
      color: "rose",
      groupId: "1"
    });
  });

  it("rejects unknown icons and colors", () => {
    expect(
      CreateCategoryInputDtoSchema.safeParse({
        name: "Unsafe",
        icon: "custom-svg",
        color: "bg-[url(secret)]",
        groupId: "1"
      }).success
    ).toBe(false);
  });

  it("validates category appearance updates", () => {
    expect(
      UpdateCategoryAppearanceInputDtoSchema.parse({
        icon: "plane",
        color: "sky"
      })
    ).toEqual({ icon: "plane", color: "sky" });
    expect(
      UpdateCategoryAppearanceInputDtoSchema.safeParse({
        icon: "plane",
        color: "chartreuse"
      }).success
    ).toBe(false);
  });

  it("requires appearance in category responses", () => {
    expect(
      CategoryOutputSchema.safeParse({
        id: "1",
        createdAt: "2026-09-27T00:00:00.000Z",
        name: "Food",
        groupId: "1"
      }).success
    ).toBe(false);
  });
});
