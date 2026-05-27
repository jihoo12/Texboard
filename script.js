const workspace = document.getElementById("workspace");
const addBtn = document.getElementById("addTextareaBtn");
const toggleLineBtn = document.getElementById("toggleLineBtn");
const svgCanvas = document.getElementById("svg-canvas");

let currentDraggable = null;
let offsetX = 0;
let offsetY = 0;

let isDrawingMode = false;
let connections = []; 
let activeLine = null;
let startContainer = null;

function generateId() {
    return 'node_' + Math.random().toString(36).substr(2, 9);
}

// --- MathJax Live Preview Logic ---
function renderMath(container) {
    const textarea = container.querySelector('textarea');
    const preview = container.querySelector('.tex-preview');
    
    // Clean/format text content (replace line breaks with html breaks for formatting)
    let rawText = textarea.value;
    if(!rawText.trim()) {
        preview.innerHTML = `<span style="color:#aaa;">${textarea.placeholder}</span>`;
        return;
    }
    
    preview.innerHTML = rawText.replace(/\n/g, '<br>');

    // Tell MathJax to typeset the specific preview element
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([preview]).then(() => {
            // Lines might need updating if math container expanded vertically
            updateAllConnections();
        });
    }
}

// --- Setup Editor Listeners ---
function attachEditorEvents(container) {
    container.id = generateId();
    const textarea = container.querySelector('textarea');
    const preview = container.querySelector('.tex-preview');

    // Enter editing mode on click
    textarea.addEventListener('focus', () => {
        container.classList.add('editing');
    });

    // Return to preview mode on blur and compile MathJax
    textarea.addEventListener('blur', () => {
        container.classList.remove('editing');
        renderMath(container);
    });

    // Also allow clicking on preview to re-edit
    preview.addEventListener('click', () => {
        container.classList.add('editing');
        textarea.focus();
    });

    // Synchronize dimensions dynamically if user resizes the box
    textarea.addEventListener('pointerdown', () => {
        // Track resize via standard MutationObserver or simple interval while clicking
        const checkResize = setInterval(() => {
            preview.style.width = textarea.style.width;
            preview.style.height = textarea.style.height;
            updateAllConnections();
        }, 50);
        
        document.addEventListener('pointerup', () => clearInterval(checkResize), { once: true });
    });
    
    // Generate initial empty placeholder text
    renderMath(container);
}

// Initialize default containers
document.querySelectorAll('.draggable-container').forEach(el => attachEditorEvents(el));

// --- Toggle Connection Mode ---
toggleLineBtn.addEventListener("click", () => {
    isDrawingMode = !isDrawingMode;
    if (isDrawingMode) {
        toggleLineBtn.textContent = "❌ Cancel Connect";
        toggleLineBtn.classList.add("active");
        document.body.classList.add("drawing-mode");
    } else {
        resetDrawingState();
    }
});

function resetDrawingState() {
    isDrawingMode = false;
    toggleLineBtn.textContent = "🔗 Connect Mode: OFF";
    toggleLineBtn.classList.remove("active");
    document.body.classList.remove("drawing-mode");
    if (activeLine) {
        activeLine.remove();
        activeLine = null;
    }
    startContainer = null;
}

// --- Create New Textarea Function ---
addBtn.addEventListener("click", () => {
    const newContainer = document.createElement("div");
    newContainer.className = "draggable-container";
    
    const randomTop = Math.floor(Math.random() * 40) + 25; 
    const randomLeft = Math.floor(Math.random() * 40) + 25; 
    newContainer.style.top = `${randomTop}%`;
    newContainer.style.left = `${randomLeft}%`;

    newContainer.innerHTML = `
        <div class="drag-handle"></div>
        <div class="editor-wrapper">
            <textarea placeholder="Type TeX here..."></textarea>
            <div class="tex-preview"></div>
        </div>
    `;

    workspace.appendChild(newContainer);
    attachEditorEvents(newContainer);
});

// --- Calculation helper to update paths dynamically ---
function getCenterCoords(element) {
    const handle = element.querySelector('.drag-handle');
    const handleRect = handle.getBoundingClientRect();
    return {
        x: handleRect.left + handleRect.width / 2 + window.scrollX,
        y: handleRect.top + handleRect.height / 2 + window.scrollY
    };
}

function updateLinePath(lineElement, startX, startY, endX, endY) {
    const deltaX = Math.abs(endX - startX) * 0.5;
    const controlX1 = startX + (endX > startX ? deltaX : -deltaX);
    lineElement.setAttribute("d", `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX1} ${endY}, ${endX} ${endY}`);
}

function updateAllConnections() {
    connections.forEach(conn => {
        const start = getCenterCoords(conn.from);
        const end = getCenterCoords(conn.to);
        updateLinePath(conn.path, start.x, start.y, end.x, end.y);
    });
}

// --- Global Dragging & Drawing Logic ---
document.addEventListener("mousedown", (e) => {
    if (!e.target.classList.contains("drag-handle")) return;
    
    const container = e.target.closest(".draggable-container");

    if (isDrawingMode) {
        startContainer = container;
        const startCoords = getCenterCoords(startContainer);

        activeLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
        activeLine.setAttribute("stroke", "#0078d4");
        activeLine.setAttribute("stroke-width", "3");
        activeLine.setAttribute("fill", "none");
        activeLine.setAttribute("stroke-dasharray", "4 4"); 
        activeLine.setAttribute("marker-end", "url(#arrow)");
        svgCanvas.appendChild(activeLine);
    } else {
        currentDraggable = container;
        offsetX = e.clientX - currentDraggable.getBoundingClientRect().left;
        offsetY = e.clientY - currentDraggable.getBoundingClientRect().top;
        currentDraggable.style.opacity = "0.8";
        
        document.querySelectorAll(".draggable-container").forEach(el => el.style.zIndex = "1");
        currentDraggable.style.zIndex = "10";
    }
});

document.addEventListener("mousemove", (e) => {
    if (isDrawingMode && activeLine && startContainer) {
        const start = getCenterCoords(startContainer);
        updateLinePath(activeLine, start.x, start.y, e.clientX, e.clientY);
        return;
    }

    if (!currentDraggable) return;

    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    x = Math.max(0, Math.min(x, window.innerWidth - currentDraggable.offsetWidth));
    y = Math.max(0, Math.min(y, window.innerHeight - currentDraggable.offsetHeight));

    currentDraggable.style.left = `${x}px`;
    currentDraggable.style.top = `${y}px`;

    updateAllConnections();
});

document.addEventListener("mouseup", (e) => {
    if (isDrawingMode && activeLine) {
        const targetHandle = e.target.classList.contains("drag-handle") ? e.target : null;
        const endContainer = targetHandle ? targetHandle.closest(".draggable-container") : null;

        if (endContainer && endContainer !== startContainer) {
            activeLine.setAttribute("stroke-dasharray", "none"); 
            
            connections.push({
                from: startContainer,
                to: endContainer,
                path: activeLine
            });
            
            updateAllConnections();
        } else {
            activeLine.remove(); 
        }
        
        activeLine = null;
        resetDrawingState();
        return;
    }

    if (currentDraggable) {
        currentDraggable.style.opacity = "1";
        currentDraggable = null;
    }
});

window.addEventListener('resize', updateAllConnections);