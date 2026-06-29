# Workshop AI Assist Pattern

When adding a new AI assist to the workshop engine:

1. **Register** in `src/lib/workshop/ai-registry.ts`:
   ```typescript
   {
     key: 'your.assist',
     model: 'claude-sonnet-4-6', // or opus for heavy synthesis
     stream: false,
     description: 'What this does',
     buildPrompt: (ctx, input) => `Your prompt using ${ctx.customerName}...`,
     schema: z.object({ ... }), // optional, for structured output
   }
   ```

2. **Call** from component via tRPC:
   ```typescript
   const runAssist = trpc.workshop.runAssist.useMutation();
   runAssist.mutate({ workshopId: ws.id, assistKey: 'your.assist', input: {...} });
   ```

3. **Handle response**: `result.output` (parsed if schema) or `result.raw` (text)

4. **Log**: Interaction auto-logged with Accept/Edit/Reject tracking

5. **Custom prompts**: Pass `_customPrompt` in input to override the registered prompt
