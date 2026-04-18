export function createIbkrProvider() {
  return {
    getPublicConfig() {
      return {
        provider: "ibkr",
        providerLabel: "Interactive Brokers",
        mode: "unconfigured",
        modeLabel: "待設定",
        scopeLabel: "券商帳戶 / 可下單通道",
        latencyTarget: "依訂閱與帳戶而定",
        disclaimer: "此 adapter 預留給 IBKR Client Portal Gateway 或 Web API。要拿到 API 報價與下單能力，仍需完成帳戶、資料訂閱與 API 啟用。",
      };
    },

    async getSnapshot() {
      throw new Error("IBKR provider 尚未接上 Client Portal Gateway / Web API。");
    },

    subscribe() {
      throw new Error("IBKR provider 尚未接上 Client Portal Gateway / Web API。");
    },
  };
}
