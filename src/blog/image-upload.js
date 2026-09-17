import { requireClient } from './supabase.js';

const formats = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export function validateImageFile(file) {
 if (!formats[file.type]) throw new Error('请选择 PNG、JPG、WebP、GIF 或 AVIF 图片。');
 if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error('每张图片不能超过 6 MB。');
}
export async function uploadBlogImage(file) {
 validateImageFile(file);
 const client = requireClient();
 const name = new Date().toISOString().slice(0, 10) + '/' + crypto.randomUUID() + '.' + formats[file.type];
 const bucket = client.storage.from('blog-images');
 const { error } = await bucket.upload(name, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
 if (error) {
  if (/bucket.*not found/i.test(error.message)) throw new Error('图片上传尚未启用，请先完成图片存储配置。也可以使用图片链接插入。');
  if (/row.level|permission|unauthorized/i.test(error.message)) throw new Error('没有图片上传权限，请检查登录和图片存储配置。');
  throw new Error('图片上传失败，请检查网络后重试。');
 }
 return { src: bucket.getPublicUrl(name).data.publicUrl, alt: file.name.replace(/\.[^.]+$/, '') };
}
