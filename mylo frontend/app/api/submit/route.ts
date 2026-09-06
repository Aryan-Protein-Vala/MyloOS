import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // We send this server-side to bypass browser CORS preflight issues
    const res = await fetch('https://formsubmit.co/ajax/aryansharma24112003@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Provide a dummy user-agent to pretend we are a browser if needed
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      const result = await res.json();
      return NextResponse.json(result);
    } else {
      const text = await res.text();
      return NextResponse.json({ error: 'FormSubmit API failed', details: text }, { status: res.status });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
