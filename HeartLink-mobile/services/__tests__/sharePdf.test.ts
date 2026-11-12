import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { pdfFileName, sharePdf } from "../sharePdf";

jest.mock("expo-print", () => ({ printToFileAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///data/app/cache/",
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: "base64" },
}));

const print = Print.printToFileAsync as jest.Mock;
const available = Sharing.isAvailableAsync as jest.Mock;
const share = Sharing.shareAsync as jest.Mock;
const write = FileSystem.writeAsStringAsync as jest.Mock;

describe("sharePdf (every report and summary, 2026-11-12)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    available.mockResolvedValue(true);
    print.mockResolvedValue({ uri: "file:///somewhere/Print/abc.pdf", base64: "JVBERi0=" });
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("shares a copy in the app's own folder, never the print file the share sheet can't read", async () => {
    await expect(sharePdf("<p>x</p>", "HeartLink visit summary", "Share")).resolves.toBe("shared");
    expect(write).toHaveBeenCalledWith("file:///data/app/cache/HeartLink_visit_summary.pdf", "JVBERi0=", { encoding: "base64" });
    expect(share).toHaveBeenCalledWith("file:///data/app/cache/HeartLink_visit_summary.pdf", expect.objectContaining({ mimeType: "application/pdf" }));
    expect(share.mock.calls[0][0]).not.toContain("/Print/");
  });

  it("says when the phone can't share, without making a PDF", async () => {
    available.mockResolvedValue(false);
    await expect(sharePdf("<p>x</p>", "a", "Share")).resolves.toBe("unavailable");
    expect(print).not.toHaveBeenCalled();
  });

  it("ignores a second tap while the share sheet opens", async () => {
    await sharePdf("<p>x</p>", "a", "Share");
    await expect(sharePdf("<p>x</p>", "a", "Share")).resolves.toBe("busy");
    jest.advanceTimersByTime(1000);
    await expect(sharePdf("<p>x</p>", "a", "Share")).resolves.toBe("shared");
  });

  it("fails loudly if the PDF comes back empty, so the screen can say so", async () => {
    print.mockResolvedValue({ uri: "file:///x.pdf" });
    await expect(sharePdf("<p>x</p>", "a", "Share")).rejects.toThrow();
    expect(share).not.toHaveBeenCalled();
  });

  it("makes safe file names", () => {
    expect(pdfFileName("HeartLink trends 7 days")).toBe("HeartLink_trends_7_days.pdf");
    expect(pdfFileName("report.pdf")).toBe("report.pdf");
    expect(pdfFileName("///")).toBe("HeartLink.pdf");
  });
});
