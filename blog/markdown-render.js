(function () {
	const root = document.getElementById("markdownRoot");
	if (!root) {
		return;
	}

	function escapeHtml(value) {
		return value
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

	function unescapeMarkdown(value) {
		return value
			.replace(/\\([\\`*{}\[\]()#+\-.!_|>])/g, "$1")
			.replace(/&amp;/g, "&")
			.replace(/&#39;/g, "'");
	}

	function renderInline(value) {
		let html = escapeHtml(unescapeMarkdown(value));
		html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
		html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
		html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
		html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
		html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
		return html;
	}

	function flushParagraph(blocks, paragraph) {
		if (!paragraph.length) {
			return;
		}
		blocks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
		paragraph.length = 0;
	}

	function flushList(blocks, list) {
		if (!list.length) {
			return;
		}
		blocks.push(`<ul>${list.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
		list.length = 0;
	}

	function renderMarkdown(markdown) {
		const lines = markdown.replace(/\r\n/g, "\n").split("\n");
		const blocks = [];
		const paragraph = [];
		const list = [];
		let inCode = false;
		let codeLang = "";
		let code = [];
		let skipFirstTitle = true;

		lines.forEach((line) => {
			const trimmed = line.trim();
			const codeMatch = trimmed.match(/^```(.*)$/);
			if (codeMatch) {
				if (inCode) {
					blocks.push(`<pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(code.join("\n"))}</code></pre>`);
					code = [];
					codeLang = "";
					inCode = false;
				} else {
					flushParagraph(blocks, paragraph);
					flushList(blocks, list);
					codeLang = codeMatch[1].trim().toLowerCase();
					inCode = true;
				}
				return;
			}

			if (inCode) {
				code.push(line);
				return;
			}

			if (!trimmed) {
				flushParagraph(blocks, paragraph);
				flushList(blocks, list);
				return;
			}

			const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
			if (heading) {
				flushParagraph(blocks, paragraph);
				flushList(blocks, list);
				if (skipFirstTitle && heading[1].length === 1) {
					skipFirstTitle = false;
					return;
				}
				skipFirstTitle = false;
				const level = Math.min(heading[1].length + 1, 5);
				blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
				return;
			}
			skipFirstTitle = false;

			if (/^>\s?/.test(trimmed)) {
				flushParagraph(blocks, paragraph);
				flushList(blocks, list);
				blocks.push(`<blockquote>${renderInline(trimmed.replace(/^>\s?/, ""))}</blockquote>`);
				return;
			}

			const listItem = trimmed.match(/^[-*]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/);
			if (listItem) {
				flushParagraph(blocks, paragraph);
				list.push(listItem[1]);
				return;
			}

			if (/^!\[/.test(trimmed)) {
				flushParagraph(blocks, paragraph);
				flushList(blocks, list);
				blocks.push(`<figure>${renderInline(trimmed)}</figure>`);
				return;
			}

			flushList(blocks, list);
			paragraph.push(trimmed);
		});

		flushParagraph(blocks, paragraph);
		flushList(blocks, list);
		if (inCode) {
			blocks.push(`<pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(code.join("\n"))}</code></pre>`);
		}
		return blocks.join("\n");
	}

	fetch(root.dataset.md)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			return response.text();
		})
		.then((markdown) => {
			root.innerHTML = renderMarkdown(markdown);
		})
		.catch(() => {
			root.innerHTML = "<p>文章加载失败。</p>";
		});
})();
