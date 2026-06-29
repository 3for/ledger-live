import Transport from "@ledgerhq/hw-transport";
import { DmkSignerTron, LegacySignerTron } from "@ledgerhq/live-signer-tron";
import type { DeviceManagementKit } from "@ledgerhq/device-management-kit";
import { isDmkTransport } from "../../hw/dmkUtils";
import { getTronSignerInstance, setTronLdmkEnabled } from "./setup";

jest.mock(
  "@ledgerhq/coin-tron/bridge",
  () => ({
    createBridges: jest.fn(() => "bridge"),
  }),
  { virtual: true },
);
jest.mock("@ledgerhq/coin-tron/signer", () => jest.fn(), { virtual: true });
jest.mock("@ledgerhq/coin-tron/test/cli", () => jest.fn(() => "cliTools"), { virtual: true });
jest.mock("@ledgerhq/live-signer-tron", () => ({
  DmkSignerTron: jest.fn(),
  LegacySignerTron: jest.fn(),
}));
jest.mock("../../hw/dmkUtils");

const MockedDmkSignerTron = DmkSignerTron as jest.MockedClass<typeof DmkSignerTron>;
const MockedLegacySignerTron = LegacySignerTron as jest.MockedClass<typeof LegacySignerTron>;
const mockedIsDmkTransport = isDmkTransport as jest.MockedFunction<typeof isDmkTransport>;

describe("getTronSignerInstance", () => {
  const mockTransport = {} as Transport;
  const mockDmk = {} as DeviceManagementKit;
  const dmkTransport = {
    dmk: mockDmk,
    sessionId: "test-session-id",
  } as unknown as Transport & { dmk: DeviceManagementKit; sessionId: string };

  beforeEach(() => {
    setTronLdmkEnabled(false);
    mockedIsDmkTransport.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("creates a LegacySignerTron by default", () => {
    getTronSignerInstance(mockTransport);

    expect(MockedLegacySignerTron).toHaveBeenCalledWith(mockTransport);
    expect(MockedDmkSignerTron).not.toHaveBeenCalled();
  });

  it("keeps the legacy signer for DMK transport when the flag is disabled", () => {
    mockedIsDmkTransport.mockReturnValue(true);

    getTronSignerInstance(dmkTransport);

    expect(MockedLegacySignerTron).toHaveBeenCalledWith(dmkTransport);
    expect(MockedDmkSignerTron).not.toHaveBeenCalled();
  });

  it("creates a DmkSignerTron for DMK transport when the flag is enabled", () => {
    mockedIsDmkTransport.mockReturnValue(true);
    setTronLdmkEnabled(true);

    getTronSignerInstance(dmkTransport);

    expect(MockedDmkSignerTron).toHaveBeenCalledWith(mockDmk, "test-session-id");
    expect(MockedLegacySignerTron).not.toHaveBeenCalled();
  });

  it("keeps the legacy signer for non-DMK transport when the flag is enabled", () => {
    setTronLdmkEnabled(true);

    getTronSignerInstance(mockTransport);

    expect(MockedLegacySignerTron).toHaveBeenCalledWith(mockTransport);
    expect(MockedDmkSignerTron).not.toHaveBeenCalled();
  });
});
