export const showcaseProjects = [
  {
    id: "visual-draft-editor",
    number: "01",
    category: "AI / FRONTEND TOOL",
    title: "Visual Draft Editor",
    summary: "直接在页面上选择、标注与调整元素，再把修改意图交给 AI。",
    background: "只靠文字描述界面修改，常常难以准确表达位置和层级。这个工具把沟通放回真实页面，让可视化操作成为开发反馈的一部分。",
    highlights: ["选择页面元素并标注文本", "调整组件位置与尺寸", "汇总修改记录，导出给 Codex"],
    tech: ["React", "TypeScript", "DOM Overlay", "CSS Transform"],
    image: "/projects/visual-draft-editor.png",
    imageAlt: "Visual Draft Editor 在网页上选择元素并查看位置、尺寸的界面",
    mediaCaption: "01 / VISUAL DRAFT EDITOR",
    action: "github",
    githubUrl: "https://github.com/ryota-kk/AI-Visual-Draft-Editor"
  },
  {
    id: "bitmap-to-vector",
    number: "02",
    category: "GRAPHICS / WEB TOOL",
    title: "Bitmap to Vector Tool",
    summary: "把 JPG、PNG 和低清图形整理为可继续编辑的 SVG 矢量文件。",
    background: "位图在放大和二次编辑时容易失真。这个工具把上传、路径生成、预览与导出串成一个可操作的 Web 流程。",
    highlights: ["上传图形并生成矢量路径", "预览与调整处理结果", "导出 SVG、PNG 预览和 PDF"],
    tech: ["React", "FastAPI", "SVG", "Computer Vision"],
    image: "/projects/bitmap-to-vector-tool-ui.png",
    imageAlt: "印前与标签图形小工具页面，展示位图转矢量图入口及适用素材",
    mediaCaption: "02 / BITMAP TO VECTOR",
    action: "vector",
    githubUrl: "https://github.com/ryota-kk/svg.tool"
  },
  {
    id: "esports-data-platform",
    number: "03",
    category: "CLIENT WORK / FRONTEND",
    title: "电竞数据管理平台",
    summary: "为客户制作结合水墨场景、数据工作区与多屏导航的前端体验。",
    background: "项目需要同时照顾品牌表达和日常操作。我负责前端视觉、场景衔接与响应式交互；业务数据由客户现有系统接入。",
    highlights: ["门面场景与视频转场", "五屏数据界面与导航", "桌面及移动端适配"],
    tech: ["HTML", "CSS", "JavaScript", "Video"],
    image: "/projects/esports-data-platform.jpg",
    imageAlt: "客户项目所使用的水墨武侠视觉素材，不含客户名称或业务数据",
    mediaCaption: "03 / CLIENT PROJECT · ANONYMIZED",
    action: "private"
  }
];
