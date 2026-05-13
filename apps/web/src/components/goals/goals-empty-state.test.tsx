// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalsEmptyState } from "./goals-empty-state";

describe("GoalsEmptyState (KAN-71)", () => {
  it("renders the prompt and primary CTA", () => {
    const onCreate = vi.fn();
    render(<GoalsEmptyState onCreate={onCreate} />);
    expect(screen.getByText(/What are you saving for/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Create your first goal/i }));
    expect(onCreate).toHaveBeenCalledWith();
  });

  it("passes the chip label as the suggested name when clicked", () => {
    const onCreate = vi.fn();
    render(<GoalsEmptyState onCreate={onCreate} />);
    fireEvent.click(screen.getByRole("button", { name: "Holiday" }));
    expect(onCreate).toHaveBeenCalledWith("Holiday");
  });
});
