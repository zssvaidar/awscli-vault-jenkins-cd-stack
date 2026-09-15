YOUR_API_KEY=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjZjNTQ2ZjIyLTk5ZGMtNGY3Ny1iMTliLWI4ZTI3Y2IzZWE5ZiJ9.eyJzdWIiOiJmZDAxMzcwNy02M2JhLTQzYmEtODM3NC1iMWIxYjQzNjFjYmMiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiZmQwMTM3MDctNjNiYS00M2JhLTgzNzQtYjFiMWI0MzYxY2JjIiwiaWF0IjoxNzg4NjI3NzQxLCJleHAiOjQ5NDIyMjc3NDAsImp0aSI6IjdjMjgzNGMxLWIyODMtNDAyNi1iMGRkLWRjYmVhMjdkMGUxNSJ9.fzEE2BJnxWyJSwEbh_VZscpP1DC3k5Ar9OQEbw_huDCTTX8kHkzy95lufvxoSqTOvRBwAcwtNwlDmB2bNqbcug
curl -X POST http://localhost:3000/s/company/create  \
  -H "Authorization: Bearer $YOUR_API_KEY" \
  -H "Content-Type: application/json" \


# SECRET="78703028c477e78122c5eab3268ffb9ec7218a4f4fc11da9de52036e745eb70b"
# BODY='{"type":"test","metadata":{"twentyWorkspaceId":"fd013707-63ba-43ba-8374-b1b1b4361cbc"}}'
# SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

# curl -X POST http://localhost:3000/webhooks/server/9bd834c5-d6bf-4f54-b333-82fa6b9a5502 \
#   -H "x-hub-signature-256: $SIG" \
#   -H "Content-Type: application/json" \
#   -d "$BODY"