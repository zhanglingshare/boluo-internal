# 数据契约 v1（内部开发）

所有输入数据均为CSV（UTF-8）或XLSX（首张工作表）。首行必须为字段名。导入不会直接覆盖Demo，会生成新数据快照。

| 类型 | 必需字段 | 备注 |
|---|---|---|
| macro | year, primary, secondary, tertiary | 亿元，三次产业增加值；至少有且只有一条2025年记录；同一时期及价格口径 |
| enterprises | enterprise_id, sector, subsector, town, employees, revenue_million | 营收为百万元，不能直接加总为GDP |
| survey | respondent_id, SA1...SA4, SU1...SU3, OP1...OP3 | 所有题目均为1–7的整数；可选enterprise_id |
| relations | source_id, target_id, relation_type, value_million | 有向关系；采购额百万元；真实关系需核对主体ID和授权 |
| projects | project_id, sector, stage, start_year, investment_million | 投资额百万元；不等于增加值 |
| workers | respondent_id, sector, commute_minutes, skills_gap, monthly_pay_cny | 个人数据正式导入需另行确认授权与保护措施 |

**价格口径警告**：目前Demo仅用一致的“现价增加值”做合成名义增长实验。正式接入实际数据时需要增加经济口径元数据与价格指数，才能估计实际增速。未升级前，只允许用于研究验证。

**数据权限**：当前`IMPORTED_UNVERIFIED`表示文件已导入而未经来源和使用权限复核。现实行政、企业、个人数据不应直接交给GPT/豆包或提交仓库。

**混合快照**：若仅导入真实宏观数据，其他企业调查、项目与关系依然是合成的。严禁把混合结果描述为真实结构估计或正式预测。

**专业软件**：`external_result_template.json`是人工填写模板，模型和数据必须保持相同。对照不构成等价性认证。
