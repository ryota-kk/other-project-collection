import { showcaseProjects } from "./showcaseProjects";
import "../styles/showcase.css";

function ProjectAction({ project, onOpenVector }) {
  if (project.action === "vector") {
    return (
      <button className="showcase-action" type="button" onClick={onOpenVector}>
        进入位图转 SVG 工具 <span aria-hidden="true">↗</span>
      </button>
    );
  }

  if (project.action === "github") {
    return (
      <a className="showcase-action" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
        查看项目仓库 <span aria-hidden="true">↗</span>
      </a>
    );
  }

  return <span className="showcase-private-note">客户项目 · 公开预览暂未开放</span>;
}

export default function PersonalHomePage({ onOpenVector }) {
  return (
    <div className="selected-work">
      <header className="selected-work-header">
        <a className="selected-work-brand" href="https://www.ryota.top/" aria-label="返回 Ryota 个人主页">
          RYOTA <span>/ STUDIO</span>
        </a>
        <nav className="selected-work-nav" aria-label="页面导航">
          <a href="#projects">项目</a>
          <button type="button" onClick={onOpenVector}>SVG 工具 <span aria-hidden="true">↗</span></button>
        </nav>
      </header>

      <main className="selected-work-main">
        <section className="selected-work-intro" aria-labelledby="selected-work-title">
          <div>
            <p className="selected-work-kicker">SELECTED WORK / 03</p>
            <h1 id="selected-work-title">其他项目<span className="selected-work-period">.</span></h1>
            <p className="selected-work-deck">从可视化编辑，到图形处理与客户交付。三个不同方向，记录我如何把想法做成可用的界面。</p>
          </div>
          <ol className="selected-work-index" aria-label="项目目录">
            {showcaseProjects.map((project) => (
              <li key={project.id}>
                <a href={`#${project.id}`}>
                  <span>{project.number}</span>
                  <strong>{project.title}</strong>
                  <span aria-hidden="true">↘</span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <div id="projects" className="selected-work-projects">
          {showcaseProjects.map((project, index) => (
            <section
              className={`showcase-project${index % 2 ? " showcase-project-reverse" : ""}`}
              id={project.id}
              key={project.id}
              aria-labelledby={`${project.id}-title`}
            >
              <div className={`showcase-media showcase-media-${project.id}`}>
                <img src={project.image} alt={project.imageAlt} loading={index === 0 ? "eager" : "lazy"} />
                <span className="showcase-media-caption">{project.mediaCaption}</span>
              </div>

              <div className="showcase-copy">
                <p className="showcase-project-kicker"><span>{project.number}</span> / {project.category}</p>
                <h2 id={`${project.id}-title`}>{project.title}</h2>
                <p className="showcase-summary">{project.summary}</p>

                <div className="showcase-detail">
                  <div>
                    <h3>项目背景</h3>
                    <p>{project.background}</p>
                  </div>
                  <div>
                    <h3>核心工作</h3>
                    <ul>
                      {project.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
                    </ul>
                  </div>
                </div>

                <p className="showcase-tech"><span>TECH / </span>{project.tech.join(" · ")}</p>
                <div className="showcase-actions">
                  <ProjectAction project={project} onOpenVector={onOpenVector} />
                  {project.action === "vector" && (
                    <a className="showcase-text-link" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                      查看源码 <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="selected-work-footer">
        <span>RYOTA / SELECTED WORK</span>
        <a href="https://www.ryota.top/">返回个人主页 <span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  );
}
