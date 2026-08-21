import { authService } from "@/services/auth.service";

describe("authService", () => {
  it("debe estar definido y tener los metodos clave", () => {
    expect(authService).toBeDefined();
    expect(typeof authService.registerCompany).toBe("function");
    expect(typeof authService.login).toBe("function");
    expect(typeof authService.logout).toBe("function");
    expect(typeof authService.getCurrentSession).toBe("function");
  });
});
