import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.200.0/http/file_server.ts";
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";

// --- 辅助函数：生成错误 JSON 响应 ---
function createJsonErrorResponse(message: string, statusCode = 500) {
    return new Response(JSON.stringify({ error: { message, code: statusCode } }), {
        status: statusCode,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
}

// --- 图片尺寸调整函数 ---
async function resizeImageToOriginalDimensions(
    imageUrl: string, 
    targetWidth: number, 
    targetHeight: number
): Promise<string> {
    try {
        // 如果图片URL是data URL，直接返回（前端会处理）
        if (imageUrl.startsWith('data:')) {
            console.log("Image is already in data URL format, returning as-is");
            return imageUrl;
        }
        
        // 如果是外部URL，我们需要下载并处理
        console.log(`Resizing image from ${imageUrl} to ${targetWidth}x${targetHeight}`);
        
        // 由于Deno环境的限制，我们返回原始URL并让前端处理尺寸调整
        // 前端JavaScript可以使用Canvas API来调整图片尺寸
        console.log("Returning original image URL for frontend processing");
        return imageUrl;
        
    } catch (error) {
        console.error("Error in resizeImageToOriginalDimensions:", error);
        // 如果调整失败，返回原始图片
        return imageUrl;
    }
}

// --- 获取API地址的优先级逻辑 ---
function getApiBaseUrl(frontendUrl?: string): string {
    if (frontendUrl && frontendUrl.trim()) {
        return frontendUrl.trim();
    }
    
    const envUrl = Deno.env.get("API_BASE_URL");
    if (envUrl && envUrl.trim()) {
        return envUrl.trim();
    }
    
    // 默认使用OpenRouter地址
    return "https://openrouter.ai/api/v1/chat/completions";
}

// --- 图片尺寸调整函数 ---
async function resizeImageToTargetDimensions(imageDataUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
    try {
        // 由于Deno环境限制，我们使用一个简单的方案：
        // 1. 如果图片是base64格式，直接返回（让前端处理尺寸调整）
        // 2. 如果图片是URL格式，返回原URL（让前端处理尺寸调整）
        
        console.log(`图片尺寸调整请求: 目标尺寸 ${targetWidth}x${targetHeight}`);
        
        // 检查是否是data URL格式
        if (imageDataUrl.startsWith('data:image/')) {
            console.log('检测到base64图片，返回原图片让前端处理尺寸调整');
            return imageDataUrl;
        }
        
        // 如果是URL格式，也返回原URL
        console.log('检测到URL图片，返回原URL让前端处理尺寸调整');
        return imageDataUrl;
        
    } catch (error) {
        console.error('处理图片尺寸调整时出错:', error);
        // 如果处理失败，返回原图片
        return imageDataUrl;
    }
}

// --- 核心业务逻辑：调用 OpenRouter ---
async function callOpenRouter(messages: any[], apiKey: string, apiBaseUrl: string, imageOptions?: { width?: number, height?: number }, model?: string): Promise<{ type: 'image' | 'text'; content: string }> {
    if (!apiKey) { throw new Error("callOpenRouter received an empty apiKey."); }
    
    // 使用指定的模型或默认模型
    const selectedModel = model || "google/gemini-2.5-flash-image-preview:free";
    
    const openrouterPayload: any = { 
        model: selectedModel, 
        messages,
        // 优化参数以支持图片生成
        temperature: 0.7,
        max_tokens: 4096,
        stream: false
    };
    
    // 如果指定了图片尺寸，添加到payload中
    if (imageOptions && imageOptions.width && imageOptions.height) {
        console.log(`设置图片尺寸: ${imageOptions.width}x${imageOptions.height}`);
        
        // 方法1: 使用image_options参数
        openrouterPayload.image_options = {
            width: imageOptions.width,
            height: imageOptions.height
        };
        
        // 方法2: 使用parameters参数
        if (!openrouterPayload.parameters) {
            openrouterPayload.parameters = {};
        }
        openrouterPayload.parameters.width = imageOptions.width;
        openrouterPayload.parameters.height = imageOptions.height;
        
        // 方法3: 在提示词中明确指定尺寸要求
        if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
            const lastMessage = messages[messages.length - 1];
            if (Array.isArray(lastMessage.content)) {
                const textContent = lastMessage.content.find(part => part.type === 'text');
                if (textContent && textContent.text) {
                    textContent.text += `\n\n请确保输出图片的尺寸为 ${imageOptions.width} × ${imageOptions.height} 像素。`;
                }
            }
        }
        
        console.log("修改后的payload:", JSON.stringify(openrouterPayload, null, 2));
    }
    
    console.log("Sending payload to OpenRouter:", JSON.stringify(openrouterPayload, null, 2));
    console.log("Using API Base URL:", apiBaseUrl);
    
    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟超时
    
    try {
        const apiResponse = await fetch(apiBaseUrl, {
            method: "POST", 
            headers: { 
                "Authorization": `Bearer ${apiKey}`, 
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Nano Banana"
            },
            body: JSON.stringify(openrouterPayload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
            throw new Error(`OpenRouter API error: ${apiResponse.status} - ${errorBody}`);
    }
        
        const responseData = await apiResponse.json();
    console.log("OpenRouter Response:", JSON.stringify(responseData, null, 2));
        
    const message = responseData.choices?.[0]?.message;
    console.log("提取的消息内容:", message);
        
    // 检查是否有图片返回
    if (message?.images?.[0]?.image_url?.url) { 
        console.log("检测到images字段中的图片URL:", message.images[0].image_url.url);
        return { type: 'image', content: message.images[0].image_url.url }; 
    }
        
        // 检查内容是否包含图片数据URL
        if (typeof message?.content === 'string' && message.content.startsWith('data:image/')) { 
            return { type: 'image', content: message.content }; 
        }
        
        // 检查是否有base64编码的图片
        if (typeof message?.content === 'string' && message.content.includes('data:image/')) {
            const imageMatch = message.content.match(/data:image\/[^;]+;base64,[^"]+/);
            if (imageMatch) {
                return { type: 'image', content: imageMatch[0] };
            }
        }
        
        // 检查是否有Markdown格式的图片链接
        if (typeof message?.content === 'string') {
            console.log("检查Markdown图片链接，内容:", JSON.stringify(message.content));
            console.log("内容类型:", typeof message.content);
            console.log("内容长度:", message.content.length);
            
            // 检查字符串中是否有不可见字符
            console.log("字符串的字符代码:");
            for (let i = 0; i < Math.min(message.content.length, 100); i++) {
                const char = message.content[i];
                const code = char.charCodeAt(0);
                console.log(`位置 ${i}: '${char}' (代码: ${code})`);
            }
            
            const markdownImageMatch = message.content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
            console.log("Markdown匹配结果:", markdownImageMatch);
            
            if (markdownImageMatch) {
                console.log("检测到Markdown格式图片链接:", markdownImageMatch[1]);
                return { type: 'image', content: markdownImageMatch[1] };
            } else {
                console.log("未检测到Markdown图片链接");
                // 尝试更宽松的正则表达式
                const looseMatch = message.content.match(/!\[.*?\]\((.*?)\)/);
                console.log("宽松正则表达式匹配结果:", looseMatch);
                if (looseMatch && looseMatch[1].startsWith('http')) {
                    console.log("使用宽松正则表达式检测到图片链接:", looseMatch[1]);
                    return { type: 'image', content: looseMatch[1] };
                }
            }
        }
        
        // 检查是否有直接的图片URL（不包含Markdown格式）
        if (typeof message?.content === 'string') {
            console.log("检查直接图片URL，内容:", message.content);
            const directImageUrlMatch = message.content.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp))/i);
            if (directImageUrlMatch) {
                console.log("检测到直接图片URL:", directImageUrlMatch[1]);
                return { type: 'image', content: directImageUrlMatch[1] };
            } else {
                console.log("未检测到直接图片URL");
            }
        }
        
        // 如果都没有，返回文本内容
        if (typeof message?.content === 'string' && message.content.trim() !== '') { 
            return { type: 'text', content: message.content }; 
        }
        
    return { type: 'text', content: "[模型没有返回有效内容]" };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error("请求超时，请稍后重试");
        }
        throw error;
    }
}

// --- 高效的图片预处理函数 ---
async function optimizeImageForProcessing(imageDataUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
    // 如果图片尺寸已经合适，直接返回
    if (targetWidth <= 1024 && targetHeight <= 1024) {
        return imageDataUrl;
    }
    
    // 对于大图片，在后端进行预处理以提高速度
    try {
        // 这里可以添加图片压缩逻辑
        // 由于Deno环境的限制，我们主要依赖前端的优化
        return imageDataUrl;
    } catch (error) {
        console.warn("Image optimization failed, using original:", error);
        return imageDataUrl;
    }
}

// --- 新的AI修图处理函数 ---
async function processImageEdit(
    images: string[], 
    prompt: string, 
    originalWidth: number, 
    originalHeight: number, 
    apiKey: string, 
    apiBaseUrl: string
): Promise<{ type: 'image' | 'text'; content: string; needsResize?: boolean }> {
    if (!apiKey) { throw new Error("API key is required for image editing."); }
    if (!images || images.length === 0) { throw new Error("At least one image is required."); }
    if (!prompt || prompt.trim() === '') { throw new Error("Edit prompt is required."); }
    
    // 优化提示词，使其更简洁高效，专注于快速处理
    const optimizedPrompt = `快速处理图片：${prompt}

要求：
- 保持原始尺寸 ${originalWidth} x ${originalHeight}
- 优先速度，快速生成
- 只返回图片，不要文字
- 使用高质量输出`;

    // 预处理图片以提高处理速度
    const optimizedImages = await Promise.all(
        images.map(img => optimizeImageForProcessing(img, originalWidth, originalHeight))
    );

    const messages = [{
        role: "user",
        content: [
            { type: "text", text: optimizedPrompt },
            ...optimizedImages.map(img => ({ type: "image_url", image_url: { url: img } }))
        ]
    }];

    const result = await callOpenRouter(messages, apiKey, apiBaseUrl);
    
    // 标记需要调整尺寸
    if (result.type === 'image') {
        return { ...result, needsResize: true };
    }
    
    return result;
}

// --- 主服务逻辑 ---
serve(async (req) => {
    const pathname = new URL(req.url).pathname;
    
    if (req.method === 'OPTIONS') { 
        return new Response(null, { 
            status: 204, 
            headers: { 
                "Access-Control-Allow-Origin": "*", 
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS", 
                "Access-Control-Allow-Headers": "Content-Type, Authorization, x-goog-api-key" 
            } 
        }); 
    }

    // --- 路由 1: Cherry Studio (Gemini, 流式) ---
    if (pathname.includes(":streamGenerateContent")) {
        try {
            const geminiRequest = await req.json();
            let apiKey = req.headers.get("Authorization")?.replace("Bearer ", "") || req.headers.get("x-goog-api-key") || "";
            if (!apiKey) { return createJsonErrorResponse("API key is missing.", 401); }
            if (!geminiRequest.contents?.length) { return createJsonErrorResponse("Invalid request: 'contents' array is missing.", 400); }
            
            // --- 智能提取逻辑 ---
            const fullHistory = geminiRequest.contents;
            const lastUserMessageIndex = fullHistory.findLastIndex((msg: any) => msg.role === 'user');
            let relevantHistory = (lastUserMessageIndex !== -1) ? fullHistory.slice(fullHistory.findLastIndex((msg: any, idx: number) => msg.role === 'model' && idx < lastUserMessageIndex), lastUserMessageIndex + 1) : [];
            if (relevantHistory.length === 0 && lastUserMessageIndex !== -1) relevantHistory = [fullHistory[lastUserMessageIndex]];
            if (relevantHistory.length === 0) return createJsonErrorResponse("No user message found.", 400);

            const openrouterMessages = relevantHistory.map((geminiMsg: any) => {
                const parts = geminiMsg.parts.map((p: any) => p.text ? {type: "text", text: p.text} : {type: "image_url", image_url: {url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`}});
                return { role: geminiMsg.role === 'model' ? 'assistant' : 'user', content: parts };
            });
            
            const apiBaseUrl = getApiBaseUrl();
            
            // --- 简化后的流处理 ---
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        const openRouterResult = await callOpenRouter(openrouterMessages, apiKey, apiBaseUrl, undefined, geminiRequest.model);
                        const sendChunk = (data: object) => controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
                        
                        let textToStream = (openRouterResult.type === 'image') ? "好的，图片已生成：" : openRouterResult.content;
                        for (const char of textToStream) {
                            sendChunk({ candidates: [{ content: { role: "model", parts: [{ text: char }] } }] });
                            await new Promise(r => setTimeout(r, 2));
                        }
                        
                        if (openRouterResult.type === 'image') {
                            const matches = openRouterResult.content.match(/^data:(.+);base64,(.*)$/);
                            if (matches) {
                                sendChunk({ candidates: [{ content: { role: "model", parts: [{ inlineData: { mimeType: matches[1], data: matches[2] } }] } }] });
                            }
                        }
                        
                        sendChunk({ candidates: [{ finishReason: "STOP", content: { role: "model", parts: [] } }], usageMetadata: { promptTokenCount: 264, totalTokenCount: 1578 } });
                        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                    } catch (e) {
                        console.error("Error inside stream:", e);
                        const errorMessage = e instanceof Error ? e.message : String(e);
                        const errorChunk = { error: { message: errorMessage, code: 500 } };
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
                    } finally {
                        controller.close();
                    }
                }
            });
            return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" } });
        } catch (error) {
            return createJsonErrorResponse(error instanceof Error ? error.message : String(error), 500);
        }
    }

    // --- 路由 2: Cherry Studio (Gemini, 非流式) ---
    if (pathname.includes(":generateContent")) {
        try {
            const geminiRequest = await req.json();
            let apiKey = req.headers.get("Authorization")?.replace("Bearer ", "") || req.headers.get("x-goog-api-key") || "";
            if (!apiKey) { return createJsonErrorResponse("API key is missing.", 401); }
            if (!geminiRequest.contents?.length) { return createJsonErrorResponse("Invalid request: 'contents' array is missing.", 400); }

            const fullHistory = geminiRequest.contents;
            const lastUserMessageIndex = fullHistory.findLastIndex((msg: any) => msg.role === 'user');
            let relevantHistory = (lastUserMessageIndex !== -1) ? fullHistory.slice(fullHistory.findLastIndex((msg: any, idx: number) => msg.role === 'model' && idx < lastUserMessageIndex), lastUserMessageIndex + 1) : [];
            if (relevantHistory.length === 0 && lastUserMessageIndex !== -1) relevantHistory = [fullHistory[lastUserMessageIndex]];
            if (relevantHistory.length === 0) return createJsonErrorResponse("No user message found.", 400);

            const openrouterMessages = relevantHistory.map((geminiMsg: any) => {
                const parts = geminiMsg.parts.map((p: any) => p.text ? {type: "text", text: p.text} : {type: "image_url", image_url: {url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`}});
                return { role: geminiMsg.role === 'model' ? 'assistant' : 'user', content: parts };
            });
            
            const apiBaseUrl = getApiBaseUrl();
            const openRouterResult = await callOpenRouter(openrouterMessages, apiKey, apiBaseUrl, undefined, geminiRequest.model);

            const finalParts = [];
            if (openRouterResult.type === 'image') {
                const matches = openRouterResult.content.match(/^data:(.+);base64,(.*)$/);
                if (matches) {
                    finalParts.push({ text: "好的，图片已生成：" });
                    finalParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
                } else {
                    finalParts.push({ text: "[图片生成失败]" });
                }
            } else {
                finalParts.push({ text: openRouterResult.content });
            }
            const responsePayload = { candidates: [{ content: { role: "model", parts: finalParts }, finishReason: "STOP", index: 0 }], usageMetadata: { promptTokenCount: 264, totalTokenCount: 1578 } };
            return new Response(JSON.stringify(responsePayload), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        } catch (error) {
            return createJsonErrorResponse(error instanceof Error ? error.message : String(error), 500);
        }
    }

    // --- 路由 3: 你的 Web UI (nano banana) ---
    if (pathname === "/generate") {
        try {
            const { prompt, images, apikey, model } = await req.json();
            const openrouterApiKey = apikey || Deno.env.get("OPENROUTER_API_KEY");
            if (!openrouterApiKey) { return new Response(JSON.stringify({ error: "OpenRouter API key is not set." }), { status: 500 }); }
            if (!prompt || !images || !images.length) { return new Response(JSON.stringify({ error: "Prompt and images are required." }), { status: 400 }); }
            
            const webUiMessages = [ { role: "user", content: [ {type: "text", text: prompt}, ...images.map((img: string) => ({type: "image_url", image_url: {url: img}})) ] } ];
            const apiBaseUrl = getApiBaseUrl();
            
            // --- 这里是修改的关键 ---
            const result = await callOpenRouter(webUiMessages, openrouterApiKey, apiBaseUrl, undefined, model);
    
            // 检查返回的是否是图片类型，并提取 content
            if (result && result.type === 'image') {
                // 返回给前端正确的 JSON 结构
                return new Response(JSON.stringify({ imageUrl: result.content }), { 
                    headers: { "Content-Type": "application/json" } 
                });
            } else {
                // 如果模型意外地返回了文本或其他内容，则返回错误
                const errorMessage = result ? `Model returned text instead of an image: ${result.content}` : "Model returned an empty response.";
                console.error("Error handling /generate request:", errorMessage);
                return new Response(JSON.stringify({ error: errorMessage }), { 
                    status: 500, 
                    headers: { "Content-Type": "application/json" } 
                });
            }
            
        } catch (error) {
            console.error("Error handling /generate request:", error);
            return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500 });
        }
    }

    // --- 路由 4: 新的AI修图接口 ---
    if (pathname === "/edit-image") {
        try {
            const { 
                images, 
                prompt, 
                originalWidth, 
                originalHeight, 
                apikey, 
                apiBaseUrl,
                model 
            } = await req.json();
            
            const apiKey = apikey || Deno.env.get("OPENROUTER_API_KEY");
            if (!apiKey) { 
                return new Response(JSON.stringify({ error: "API key is required." }), { status: 401 }); 
            }
            
            if (!images || images.length === 0) { 
                return new Response(JSON.stringify({ error: "At least one image is required." }), { status: 400 }); 
            }
            
            if (!prompt || prompt.trim() === '') { 
                return new Response(JSON.stringify({ error: "Edit prompt is required." }), { status: 400 }); 
            }
            
            if (!originalWidth || !originalHeight || originalWidth <= 0 || originalHeight <= 0) { 
                return new Response(JSON.stringify({ error: "Valid original dimensions are required." }), { status: 400 }); 
            }
            
            // 获取最终的API地址
            const finalApiBaseUrl = getApiBaseUrl(apiBaseUrl);
            
            console.log("Processing image edit with dimensions:", { originalWidth, originalHeight });
            console.log("Using API Base URL:", finalApiBaseUrl);
            
            // 构建专门用于图片生成的提示词
            const imageGenerationPrompt = `请根据以下要求处理图片：

${prompt}

重要要求：
1. 必须返回一张处理后的图片，不要返回文字描述
2. 保持原始尺寸 ${originalWidth} x ${originalHeight}
3. 图片质量要高，清晰度要好
4. 只返回图片，不要任何文字说明`;

            const webUiMessages = [ { 
                role: "user", 
                content: [ 
                    {type: "text", text: imageGenerationPrompt}, 
                    ...images.map((img: string) => ({type: "image_url", image_url: {url: img}})) 
                ] 
            }];
            
            const result = await callOpenRouter(webUiMessages, apiKey, finalApiBaseUrl, {
                width: originalWidth,
                height: originalHeight
            }, model);
            
            if (result && result.type === 'image') {
                // 调整图片尺寸以匹配原始尺寸
                console.log(`AI生成图片成功，开始调整尺寸到 ${originalWidth}x${originalHeight}`);
                const resizedImageUrl = await resizeImageToTargetDimensions(result.content, originalWidth, originalHeight);
                
                // 返回调整后的图片URL给前端
                const responseData = {
                    imageUrl: resizedImageUrl,
                    originalDimensions: { width: originalWidth, height: originalHeight },
                    processedAt: new Date().toISOString(),
                    needsResize: true,
                    targetDimensions: { width: originalWidth, height: originalHeight }
                };
                
                return new Response(JSON.stringify(responseData), { 
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
                });
            } else {
                // 如果模型返回了文本而不是图片，返回错误
                const errorMessage = result ? `模型返回了文本而不是图片: ${result.content}` : "模型返回了空响应";
                console.error("Error: Model returned text instead of image:", errorMessage);
                return new Response(JSON.stringify({ 
                    error: errorMessage 
                }), { 
                    status: 500, 
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
                });
            }
            
        } catch (error) {
            console.error("Error handling /edit-image request:", error);
            return new Response(JSON.stringify({ 
                error: error instanceof Error ? error.message : String(error) 
            }), { 
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }
    }

    // --- 路由 5: 静态文件服务 ---
    // 如果是根路径，返回 index.html
    if (pathname === "/" || pathname === "") {
        const indexHtml = await Deno.readTextFile("static/index.html");
        return new Response(indexHtml, { 
            headers: { 
                "Content-Type": "text/html; charset=utf-8",
                "Access-Control-Allow-Origin": "*"
            } 
        });
    }
    
    // 其他静态文件
    return serveDir(req, { fsRoot: "static", urlRoot: "", showDirListing: false, enableCors: true });
}, { port: 3000 });
