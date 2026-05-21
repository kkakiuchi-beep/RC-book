/**
 * Google Drive Picker API — 連携準備用スタブ
 *
 * 実装手順:
 *  1. Google Cloud Console で Drive API / Picker API を有効化
 *  2. NEXT_PUBLIC_GOOGLE_API_KEY と NEXT_PUBLIC_GOOGLE_CLIENT_ID を .env.local に追加
 *  3. openPicker() の TODO 箇所を実装する
 *
 * 参考: https://developers.google.com/drive/picker
 */

export interface DrivePickerResult {
  driveFileId: string;
  driveUrl: string;
  title: string;
  mimeType: string;
}

/**
 * Google Drive Picker を開いてファイルを選択させる
 * @returns 選択されたファイルの情報、キャンセル時は null
 */
export async function openDrivePicker(): Promise<DrivePickerResult | null> {
  // TODO: Google Picker API を実装する
  // 実装例:
  //   const { google } = window as any;
  //   const picker = new google.picker.PickerBuilder()
  //     .addView(google.picker.ViewId.DOCS)
  //     .setOAuthToken(oauthToken)
  //     .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
  //     .setCallback(callback)
  //     .build();
  //   picker.setVisible(true);

  console.warn("Drive Picker is not yet implemented.");
  return null;
}

/**
 * Drive ファイル ID から直接リンク URL を生成する
 */
export function driveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * mimeType から表示ラベルを返す
 */
export function mimeTypeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "application/vnd.google-apps.spreadsheet": "スプレッドシート",
    "application/vnd.google-apps.document": "ドキュメント",
    "application/vnd.google-apps.presentation": "スライド",
    "application/vnd.google-apps.folder": "フォルダ",
    "image/png": "画像",
    "image/jpeg": "画像",
  };
  return map[mimeType] ?? "ファイル";
}
