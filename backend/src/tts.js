export async function synthesize(text) {
  return {
    mode: "client-ssml",
    ssml: `<speak>${text}</speak>`
  };
}
