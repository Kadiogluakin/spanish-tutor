export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { operation } = await request.json();
    
    if (!operation) {
      return new Response(JSON.stringify({ error: 'Operation is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate operation structure
    const validOperations = ['draw_text', 'draw_shape', 'draw_arrow', 'clear_board', 'highlight'];
    
    if (!validOperations.includes(operation.type)) {
      return new Response(JSON.stringify({ error: 'Invalid operation type' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log the operation for debugging
    console.log('Board operation received:', operation);

    // In a real application, you might want to:
    // 1. Store the operation in a database
    // 2. Broadcast it to connected clients via WebSocket
    // 3. Validate the operation data more thoroughly
    // 4. Add authentication/authorization

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Board operation processed',
      operation 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing board operation:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ 
    message: 'Board API is running',
    availableOperations: [
      'draw_text',
      'draw_shape', 
      'draw_arrow',
      'clear_board',
      'highlight'
    ]
  }), { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}