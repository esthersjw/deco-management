// ============================================
// Vercel Serverless Function - AI Proxy
// 路径: /api/ai-proxy.js
// 作用: 接收前端请求，调用智谱 GLM-4 API，返回结构化数据
// 安全: API Key 只存在 Vercel 环境变量，永不暴露给浏览器
// ============================================

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL = 'glm-4-flash'; // 免费/低价模型，个人用足够

// 系统 Prompt：告诉 AI 如何解析用户输入
const SYSTEM_PROMPT = `你是一个装修管理助手的自然语言解析引擎。

你的任务：理解用户的自然语言输入，提取装修相关的操作意图，返回结构化的 JSON。

支持的 action 类型：
1. "budget" - 添加/修改预算条目
   - category: 分类名称（如"家电"、"软装"、"硬装"）
   - item_name: 项目名称
   - estimated: 预算金额（数字，单位元）
   - actual: 已花费金额（数字，单位元，可选）
   - status: "计划中" | "已确认" | "已支付" | "已取消"
   - notes: 备注（可选）

2. "payment" - 记录一笔付款
   - description: 付款描述
   - amount: 金额（数字，单位元）
   - date: 日期（YYYY-MM-DD，可选，默认今天）
   - notes: 备注（可选）

3. "phase_update" - 更新装修阶段状态
   - phase_name: 阶段名称（如"水电"、"泥瓦"、"木工"、"油漆"、"安装"、"软装"）
   - status: "未开始" | "进行中" | "已完成"
   - progress: 进度百分比（0-100，可选）
   - notes: 备注（可选）

4. "communication" - 添加沟通记录
   - contact_name: 联系人名称
   - contact_role: 联系人角色（如"设计师"、"工长"、"项目经理"）
   - type: "微信" | "电话" | "现场" | "邮件" | "其他"
   - content: 沟通内容
   - status: "待跟进" | "已确认" | "已解决"
   - todos: 待办事项数组（可选）

5. "document" - 添加文档记录（仅元数据，文件需单独上传）
   - name: 文档名称
   - category: 分类
   - notes: 备注

重要规则：
- 金额统一转换为数字（元），如果用户说"万"则乘以 10000
- 如果用户说"调整预算"、"改成"、"改为"、"更新为"，表示修改已有预算，不是新增
- 如果用户说"付了"、"支付"、"转账"、"给了"、"花了"，表示付款记录
- 如果用户说"完成了"、"做完了"、"搞完了"、"结束了"，表示阶段完成
- 如果用户说"和XX聊"、"跟XX沟通"、"给XX打电话"，表示沟通记录
- 如果用户说"然后"、"并且"、"另外"、"还有"，表示多个独立操作
- 如果无法识别，返回 type: "unknown"，并在 notes 中说明原因

必须返回纯 JSON，不要包含 markdown 代码块标记，不要包含任何解释文字。格式：
{"actions": [...]}`;

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 从环境变量读取 API Key
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ZHIPU_API_KEY not configured' });
  }

  try {
    const { text, context } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "text" field' });
    }

    // 构建发送给智谱 API 的消息
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `用户输入："${text}"\n\n当前项目上下文：${context ? JSON.stringify(context) : '无'}\n\n请解析并返回 JSON。` }
    ];

    // 调用智谱 API
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0.1, // 低温度，确保输出稳定
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zhipu API error:', response.status, errorText);
      return res.status(502).json({ 
        error: 'AI service error', 
        status: response.status,
        detail: errorText 
      });
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content || '';

    // 解析 AI 返回的 JSON
    let parsed;
    try {
      // 尝试直接解析
      parsed = JSON.parse(aiContent);
    } catch (e) {
      // 尝试从 markdown 代码块中提取
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    // 确保返回格式正确
    if (!parsed.actions || !Array.isArray(parsed.actions)) {
      parsed = { actions: [parsed] };
    }

    // 返回给前端
    return res.status(200).json({
      success: true,
      actions: parsed.actions,
      raw: aiContent // 调试用，可选
    });

  } catch (error) {
    console.error('AI Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
