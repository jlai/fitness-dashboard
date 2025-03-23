import { Page } from "@playwright/test";

export default class Toasts {
  readonly allToasts = this.page.getByRole("alert");
  readonly successToasts = this.allToasts.filter({
    has: this.page.getByTestId("SuccessOutlinedIcon"),
  });

  constructor(private readonly page: Page) {}
}
