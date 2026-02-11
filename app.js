// 模型配置
const modelConfig = {
    openai: [
        { value: 'openai/gpt-image-1.5', label: 'GPT-Image-1.5 (最新)' },
        { value: 'openai/gpt-image-1', label: 'GPT-Image-1' },
        { value: 'openai/gpt-image-1-mini', label: 'GPT-Image-1-Mini (经济版)' },
        { value: 'openai/dall-e-3', label: 'DALL-E 3' }
    ],
    google: [
        { value: 'google/imagen-4.0-ultra-generate-001', label: 'Imagen 4.0 Ultra' },
        { value: 'google/imagen-4.0-generate-001', label: 'Imagen 4.0' },
        { value: 'google/imagen-4.0-fast-generate-001', label: 'Imagen 4.0 Fast' },
        { value: 'google/imagen-4.0-fast-generate-preview-06-06', label: 'Imagen 4.0 Fast Preview' },
        { value: 'google/imagen-3.0-generate-002', label: 'Imagen 3.0' }
    ],
    qianfan: [
        { value: 'qianfan/qwen-image', label: 'Qwen-Image (文生图)' },
        { value: 'qianfan/qwen-image-edit', label: 'Qwen-Image-Edit (图像编辑)' }
    ],
    doubao: [
        { value: 'doubao/doubao-seedream-4-5', label: 'Doubao SeeDream 4.5 (最新)' },
        { value: 'doubao/doubao-seedream-4-0', label: 'Doubao SeeDream 4.0' }
    ],
    bfl: [
        { value: 'bfl/flux-2-flex', label: 'FLUX 2 Flex' },
        { value: 'bfl/flux-2-pro', label: 'FLUX 2 Pro' },
        { value: 'bfl/FLUX.1-Kontext-pro', label: 'FLUX.1 Kontext Pro' },
        { value: 'bfl/flux-kontext-max', label: 'FLUX Kontext Max' }
    ],
    'qianfan-irag': [
        { value: 'qianfan/irag-1.0', label: 'iRAG 1.0 (文生图)' },
        { value: 'qianfan/ernie-irag-edit', label: 'ERNIE iRAG Edit (图像编辑)' }
    ],
    ideogram: [
        { value: 'ideogram/V3', label: 'Ideogram V3' }
    ]
};

// DOM 元素
const modelProviderSelect = document.getElementById('modelProvider');
const modelSelect = document.getElementById('model');
const imageForm = document.getElementById('imageForm');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const results = document.getElementById('results');
const imageGrid = document.getElementById('imageGrid');
const generateBtn = document.getElementById('generateBtn');

// 动态参数区域
const openaiParams = document.getElementById('openaiParams');
const fluxParams = document.getElementById('fluxParams');
const qwenParams = document.getElementById('qwenParams');
const doubaoParams = document.getElementById('doubaoParams');
const ideogramParams = document.getElementById('ideogramParams');

// 供应商改变时更新模型列表
modelProviderSelect.addEventListener('change', (e) => {
    const provider = e.target.value;
    modelSelect.disabled = false;
    modelSelect.innerHTML = '<option value="">选择模型...</option>';
    
    // 隐藏所有高级参数
    hideAllParams();
    
    if (provider && modelConfig[provider]) {
        modelConfig[provider].forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            modelSelect.appendChild(option);
        });
    } else {
        modelSelect.disabled = true;
    }
});

// 模型改变时显示对应的高级参数
modelSelect.addEventListener('change', (e) => {
    hideAllParams();
    const modelPath = e.target.value;
    
    if (modelPath.startsWith('openai/')) {
        openaiParams.classList.add('active');
    } else if (modelPath.startsWith('bfl/')) {
        fluxParams.classList.add('active');
    } else if (modelPath.includes('qwen')) {
        qwenParams.classList.add('active');
    } else if (modelPath.startsWith('doubao/')) {
        doubaoParams.classList.add('active');
    } else if (modelPath.startsWith('ideogram/')) {
        ideogramParams.classList.add('active');
    }
});

function hideAllParams() {
    openaiParams.classList.remove('active');
    fluxParams.classList.remove('active');
    qwenParams.classList.remove('active');
    doubaoParams.classList.remove('active');
    ideogramParams.classList.remove('active');
}

// 表单提交
imageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const model = modelSelect.value;
    const prompt = document.getElementById('prompt').value;
    
    if (!model || !prompt) {
        showError('请选择模型并输入提示词');
        return;
    }
    
    // 构建请求参数
    const input = buildInputParams(model, prompt);
    
    // 显示加载状态
    showLoading();
    hideError();
    hideResults();
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, input })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '生成失败');
        }
        
        const data = await response.json();
        
        // 检查是否是异步任务 (Flux 模型)
        if (data.output && data.output[0] && data.output[0].taskId) {
            await pollTaskStatus(data.output[0].taskId);
        } else {
            displayResults(data);
        }
        
    } catch (err) {
        console.error('Error:', err);
        showError(err.message || '生成图片时发生错误');
    } finally {
        hideLoading();
    }
});

// 构建输入参数
function buildInputParams(model, prompt) {
    const input = { prompt };
    
    // 通用参数
    const referImage = document.getElementById('referImage').value;
    const size = document.getElementById('size').value;
    const numImages = parseInt(document.getElementById('numImages').value);
    const quality = document.getElementById('quality').value;
    
    if (referImage) {
        input.image = referImage;
        input.refer_image = referImage; // Qwen 使用
        input.input_image = referImage; // Flux 使用
    }
    
    if (size && size !== 'auto') input.size = size;
    if (numImages > 1) input.n = numImages;
    if (quality !== 'medium') input.quality = quality;
    
    // OpenAI 特定参数
    if (model.startsWith('openai/')) {
        const inputFidelity = document.getElementById('inputFidelity').value;
        const moderation = document.getElementById('moderation').value;
        const outputFormat = document.getElementById('outputFormat').value;
        
        if (inputFidelity !== 'low') input.input_fidelity = inputFidelity;
        if (moderation !== 'auto') input.moderation = moderation;
        if (outputFormat !== 'jpeg') input.output_format = outputFormat;
    }
    
    // Flux 特定参数
    if (model.startsWith('bfl/')) {
        const safetyTolerance = parseInt(document.getElementById('safetyTolerance').value);
        const aspectRatio = document.getElementById('aspectRatio').value;
        const seed = document.getElementById('seed').value;
        const rawMode = document.getElementById('rawMode').checked;
        
        input.safety_tolerance = safetyTolerance;
        if (aspectRatio !== '16:9') input.aspect_ratio = aspectRatio;
        if (seed) input.seed = parseInt(seed);
        if (rawMode) input.raw = true;
    }
    
    // Qwen 特定参数
    if (model.includes('qwen')) {
        const watermark = document.getElementById('watermark').checked;
        const qwenSeed = document.getElementById('qwenSeed').value;
        
        input.watermark = watermark;
        if (qwenSeed) input.seed = parseInt(qwenSeed);
    }
    
    // Doubao 特定参数
    if (model.startsWith('doubao/')) {
        const sequentialGeneration = document.getElementById('sequentialGeneration').value;
        const maxImages = parseInt(document.getElementById('maxImages').value);
        const doubaoSeed = parseInt(document.getElementById('doubaoSeed').value);
        const doubaoWatermark = document.getElementById('doubaoWatermark').checked;
        const responseFormat = document.getElementById('responseFormat').value;
        
        input.sequential_image_generation = sequentialGeneration;
        if (sequentialGeneration === 'auto') {
            input.sequential_image_generation_options = { max_images: maxImages };
        }
        input.seed = doubaoSeed;
        input.watermark = doubaoWatermark;
        input.response_format = responseFormat;
    }
    
    // Ideogram 特定参数
    if (model.startsWith('ideogram/')) {
        const renderingSpeed = document.getElementById('renderingSpeed').value;
        const ideogramAspect = document.getElementById('ideogramAspect').value;
        
        if (renderingSpeed !== 'QUALITY') input.rendering_speed = renderingSpeed;
        if (ideogramAspect) input.aspect_ratio = ideogramAspect;
    }
    
    // Google Imagen 使用 numberOfImages
    if (model.startsWith('google/')) {
        input.numberOfImages = numImages;
        delete input.n;
    }
    
    return input;
}

// 轮询任务状态 (用于异步模型)
async function pollTaskStatus(taskId, maxAttempts = 60) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`);
            const data = await response.json();
            
            if (data.status === 'succeeded' || data.result) {
                displayResults(data);
                return;
            } else if (data.status === 'failed') {
                throw new Error('任务失败');
            }
            
            // 等待 2 秒后重试
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
            
        } catch (err) {
            console.error('轮询错误:', err);
            attempts++;
        }
    }
    
    throw new Error('任务超时');
}

// 显示结果
function displayResults(data) {
    imageGrid.innerHTML = '';
    
    // 处理不同的响应格式
    let images = [];
    
    if (data.output) {
        images = Array.isArray(data.output) ? data.output : [data.output];
    } else if (data.data) {
        images = data.data;
    } else if (data.result) {
        images = Array.isArray(data.result.sample) ? data.result.sample : [data.result.sample];
    }
    
    if (images.length === 0) {
        showError('未能生成图片，请重试');
        return;
    }
    
    images.forEach((item, index) => {
        const imageUrl = item.url || item.b64_json || item;
        
        if (!imageUrl) return;
        
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        
        // 添加加载占位符
        imageItem.innerHTML = `
            <div style="width: 100%; height: 300px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); display: flex; align-items: center; justify-content: center;">
                <div class="spinner" style="width: 40px; height: 40px; border-width: 4px;"></div>
            </div>
        `;
        
        const img = document.createElement('img');
        
        // 处理 base64 图片
        if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
            img.src = imageUrl;
        } else if (item.b64_json) {
            img.src = `data:image/png;base64,${item.b64_json}`;
        } else {
            img.src = imageUrl;
        }
        
        img.alt = `Generated image ${index + 1}`;
        img.style.display = 'none'; // 先隐藏图片
        
        img.onload = () => {
            // 图片加载完成后替换占位符
            imageItem.innerHTML = '';
            img.style.display = 'block';
            imageItem.appendChild(img);
            
            const actions = document.createElement('div');
            actions.className = 'image-actions';
            
            const downloadLink = document.createElement('a');
            downloadLink.href = img.src;
            downloadLink.download = `aihubmix-generated-${Date.now()}-${index + 1}.png`;
            downloadLink.textContent = '📥 下载';
            
            const viewLink = document.createElement('a');
            viewLink.href = img.src;
            viewLink.target = '_blank';
            viewLink.textContent = '🔍 查看大图';
            
            actions.appendChild(downloadLink);
            actions.appendChild(viewLink);
            imageItem.appendChild(actions);
        };
        
        img.onerror = () => {
            imageItem.innerHTML = `
                <div style="width: 100%; height: 300px; background: #fee; display: flex; align-items: center; justify-content: center; color: #c33; padding: 20px; text-align: center;">
                    <div>
                        <div style="font-size: 3em; margin-bottom: 10px;">⚠️</div>
                        <div>图片加载失败</div>
                        <div style="font-size: 0.85em; margin-top: 8px; opacity: 0.8;">链接可能已过期或需要代理访问</div>
                    </div>
                </div>
            `;
        };
        
        imageGrid.appendChild(imageItem);
    });
    
    showResults();
}

// UI 控制函数
function showLoading() {
    loading.classList.add('active');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '⏳ 生成中...';
}

function hideLoading() {
    loading.classList.remove('active');
    generateBtn.disabled = false;
    generateBtn.innerHTML = '🎨 生成图片';
}

function showError(message) {
    error.textContent = message;
    error.classList.add('active');
    setTimeout(() => {
        error.classList.remove('active');
    }, 5000); // 5秒后自动隐藏
}

function hideError() {
    error.classList.remove('active');
}

function showResults() {
    results.classList.add('active');
    // 平滑滚动到结果区域
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideResults() {
    results.classList.remove('active');
}
