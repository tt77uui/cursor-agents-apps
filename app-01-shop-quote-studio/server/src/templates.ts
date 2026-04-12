export type TemplateField = { id: string; label: string; placeholder?: string };

export type QuoteTemplate = {
  id: string;
  name: string;
  description: string;
  /** true = Pro only */
  proOnly: boolean;
  disclaimer: string;
  fields: TemplateField[];
  /** Mustache-like: {{fieldId}} */
  body: string;
};

export const TEMPLATES: QuoteTemplate[] = [
  {
    id: "repair_basic",
    name: "维修报价（基础）",
    description: "家电/上门维修常用字段",
    proOnly: false,
    disclaimer:
      "本页内容为模板草稿，不构成法律意见或合同；请根据实际情况修改并由您自行承担使用责任。",
    fields: [
      { id: "customer", label: "客户称呼", placeholder: "例如：张先生" },
      { id: "item", label: "项目/设备", placeholder: "例如：空调清洗" },
      { id: "amount", label: "报价金额（元）", placeholder: "例如：180" },
      { id: "warranty", label: "质保说明", placeholder: "例如：配件质保90天" },
    ],
    body: `报价单（模板草稿）\n客户：{{customer}}\n项目：{{item}}\n金额：{{amount}} 元\n质保：{{warranty}}\n\n说明：以上为报价摘要，成交以双方确认的服务单为准。`,
  },
  {
    id: "receipt_simple",
    name: "简易收据",
    description: "小额收款收据摘要",
    proOnly: false,
    disclaimer:
      "本页内容为模板草稿，不构成法律意见或财务凭证要求说明；请按当地税务与财务规范自行处理。",
    fields: [
      { id: "shop", label: "店铺/个人名称", placeholder: "例如：小李维修" },
      { id: "buyer", label: "付款方", placeholder: "例如：王女士" },
      { id: "service", label: "服务项目", placeholder: "例如：换屏" },
      { id: "amount", label: "金额（元）", placeholder: "例如：260" },
      { id: "date", label: "日期", placeholder: "例如：2025-01-18" },
    ],
    body: `收据（模板草稿）\n收款方：{{shop}}\n付款方：{{buyer}}\n项目：{{service}}\n金额：{{amount}} 元\n日期：{{date}}\n\n备注：本收据为信息摘要模板，请按需补充抬头与税号等信息。`,
  },
  {
    id: "quote_pro_bundle",
    name: "服务套餐报价（Pro）",
    description: "多行套餐项，适合美甲/清洁套餐",
    proOnly: true,
    disclaimer: "本页内容为模板草稿，不构成法律意见；套餐与价格以您店内公示为准。",
    fields: [
      { id: "customer", label: "客户称呼", placeholder: "例如：李女士" },
      { id: "package", label: "套餐名称", placeholder: "例如：深度清洁套餐" },
      { id: "line1", label: "包含项 1", placeholder: "例如：厨房油污处理" },
      { id: "line2", label: "包含项 2", placeholder: "例如：卫生间除霉" },
      { id: "amount", label: "套餐价（元）", placeholder: "例如：399" },
    ],
    body: `套餐报价（模板草稿）\n客户：{{customer}}\n套餐：{{package}}\n包含：\n- {{line1}}\n- {{line2}}\n套餐价：{{amount}} 元\n\n说明：以上为报价摘要，不构成最终合同文本。`,
  },
];

export function renderTemplate(body: string, values: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}
