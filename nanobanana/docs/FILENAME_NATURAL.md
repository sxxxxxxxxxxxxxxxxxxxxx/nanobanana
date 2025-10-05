# 📝 文件命名自然化

## 🎯 优化目标

让下载的图片文件名看起来像**普通相机拍摄的照片**，不暴露AI修图痕迹。

---

## ✅ 修改内容

### 文件命名变化

#### Before（暴露AI痕迹）
```javascript
// 方案1：包含品牌名
filename = `nanobanana-${timestamp}.jpg`
filename = `nanobanana-1440x1800-${timestamp}.jpg`

// 方案2：包含AI标识
filename = `ai-edited-${timestamp}.jpg`
filename = `edited-1440x1800-${timestamp}.jpg`
```

**问题**：
- ❌ 包含"nanobanana"品牌名
- ❌ 包含"ai-edited"明显标识
- ❌ 包含尺寸信息（暴露处理过）
- ❌ 一看就知道是AI处理的

#### After（自然命名）
```javascript
// 统一方案：模仿相机命名
filename = `IMG_${timestamp}.jpg`

// 示例
IMG_2025-10-05T14-30-25.jpg
IMG_2025-10-05T16-45-12.jpg
IMG_2025-10-05T18-20-33.jpg
```

**优势**：
- ✅ 看起来像相机拍摄
- ✅ 无AI相关标识
- ✅ 无尺寸信息
- ✅ 时间戳自然
- ✅ 格式规范（IMG_）

---

## 🔍 修改位置

### 修改1：主下载功能
**文件**: `static/script.js` - `simpleDownload()` 函数

**Data URL下载**:
```javascript
let filename = `IMG_${timestamp}.jpg`;

// 移除尺寸标注
if (targetWidth && targetHeight) {
    filename = `IMG_${timestamp}.jpg`;  // 保持一致
}
```

**外部URL下载**:
```javascript
let filename = `IMG_${timestamp}.jpg`;

// 移除尺寸标注
if (targetWidth && targetHeight) {
    filename = `IMG_${timestamp}.jpg`;  // 保持一致
}
```

### 修改2：历史记录下载
**文件**: `static/script.js` - `downloadHistoryResizedImage()` 函数

**修改前**:
```javascript
let filename = `photo-${timestamp}.png`;  // ❌ photo标识
if (targetWidth && targetHeight) {
    filename = `photo-${targetWidth}x${targetHeight}-${timestamp}.png`;  // ❌ 尺寸暴露
}
```

**修改后**:
```javascript
let filename = `IMG_${timestamp}.jpg`;  // ✅ 相机格式
if (targetWidth && targetHeight) {
    filename = `IMG_${timestamp}.jpg`;  // ✅ 统一格式
}
```

---

## 📐 命名规范

### IMG_格式说明
```
格式: IMG_YYYY-MM-DDTHH-MM-SS.jpg
示例: IMG_2025-10-05T14-30-25.jpg

组成:
├─ IMG_           - 图片前缀（相机标准）
├─ 2025-10-05     - 日期
├─ T              - 分隔符
├─ 14-30-25       - 时间
└─ .jpg           - 扩展名
```

### 为什么选择IMG_？
1. 📷 **相机标准** - 大多数相机使用IMG_前缀
2. 🔒 **无AI痕迹** - 完全自然
3. ⏱️ **时间戳** - 便于排序
4. 📁 **易于管理** - 标准命名
5. 🎯 **专业感** - 看起来正规

---

## 🎨 命名对比

### 各种命名方案对比

| 命名方式 | 示例 | AI痕迹 | 自然度 | 推荐 |
|---------|------|--------|--------|------|
| **nanobanana-** | `nanobanana-xxx.jpg` | 🔴 明显 | 2/10 | ❌ |
| **ai-edited-** | `ai-edited-xxx.jpg` | 🔴 明显 | 1/10 | ❌ |
| **edited-** | `edited-xxx.jpg` | 🟡 可疑 | 4/10 | ⚠️ |
| **photo-** | `photo-xxx.jpg` | 🟢 较低 | 6/10 | ⚠️ |
| **image-** | `image-xxx.jpg` | 🟢 较低 | 6/10 | ⚠️ |
| **IMG_** | `IMG_xxx.jpg` | 🟢 无 | 9/10 | ✅ |
| **DSC_** | `DSC_xxx.jpg` | 🟢 无 | 9/10 | ✅ |
| **时间戳** | `2025-10-05-xxx.jpg` | 🟢 无 | 8/10 | ✅ |

**选择**: `IMG_` - 最接近相机命名

---

## 📊 修改统计

### 修改位置
| 位置 | 函数 | 修改数 | 状态 |
|------|------|--------|------|
| **主下载** | `simpleDownload()` | 2处 | ✅ |
| **历史下载** | `downloadHistoryResizedImage()` | 2处 | ✅ |
| **总计** | - | **4处** | ✅ |

### 命名统一
- ✅ 所有下载统一使用 `IMG_` 前缀
- ✅ 所有文件统一使用 `.jpg` 扩展名
- ✅ 移除所有尺寸标注
- ✅ 移除所有AI相关标识

---

## 🎯 文件名示例

### 下载的文件名会是：
```
IMG_2025-10-05T14-30-25.jpg
IMG_2025-10-05T14-31-48.jpg
IMG_2025-10-05T14-32-56.jpg
IMG_2025-10-05T15-10-33.jpg
IMG_2025-10-05T16-45-18.jpg
```

### 看起来像：
```
✅ 普通相机拍摄
✅ 手机照片
✅ 专业相机导出
✅ 图库文件
```

### 不会暴露：
```
❌ AI修图
❌ 工具名称
❌ 处理痕迹
❌ 尺寸调整
```

---

## 🔒 隐私保护

### 文件名不包含
- ❌ 工具名称（nanobanana）
- ❌ AI标识（ai、edited）
- ❌ 尺寸信息（1440x1800）
- ❌ 任何修图标识

### 文件名只包含
- ✅ 标准前缀（IMG_）
- ✅ 时间戳
- ✅ 标准扩展名（.jpg）

---

## 📱 相机命名参考

### 常见相机命名格式
```
佳能:    IMG_1234.jpg
尼康:    DSC_1234.jpg
索尼:    DSC01234.jpg
iPhone:  IMG_1234.jpg
安卓:    IMG_20251005_143025.jpg
```

**我们的格式**:
```
IMG_2025-10-05T14-30-25.jpg
```

**优势**:
- ✅ 与佳能/iPhone格式接近
- ✅ 时间戳完整（年月日时分秒）
- ✅ 易于排序
- ✅ 完全自然

---

## ✅ 效果验证

### 下载测试
1. 生成一张图片
2. 点击下载
3. 查看下载文件名

**预期**:
```
✅ 文件名: IMG_2025-10-05T14-30-25.jpg
✅ 格式: JPEG
✅ 无AI痕迹
✅ 看起来自然
```

### 历史记录下载测试
1. 打开历史记录
2. 点击下载按钮
3. 查看文件名

**预期**:
```
✅ 文件名: IMG_2025-10-05T14-31-48.jpg
✅ 格式: JPEG
✅ 无AI痕迹
✅ 与主下载一致
```

---

## 🎊 总结

### 修改成果
✅ **所有下载统一命名** - IMG_格式  
✅ **移除AI标识** - 无痕迹  
✅ **移除尺寸信息** - 不暴露处理  
✅ **统一扩展名** - .jpg格式  
✅ **相机风格** - 完全自然

### 隐私保护
- 🔒 **无工具名称**
- 🔒 **无AI标识**
- 🔒 **无处理痕迹**
- 🔒 **完全隐匿**

### 用户体验
- ✅ **自然命名**
- ✅ **专业规范**
- ✅ **易于管理**
- ✅ **不引起怀疑**

---

**修改完成日期**: 2025年10月5日  
**命名格式**: `IMG_${timestamp}.jpg`  
**隐匿效果**: ⭐⭐⭐⭐⭐ (完美)

🎉 **文件命名已完美自然化！现在下载的文件看起来就像普通相机拍摄的照片，完全隐匿AI修图痕迹！** 📷✨
