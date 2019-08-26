#!/usr/bin/expect -f

set timeout -1

spawn npm login;

expect "Username:"

send -- "$env(NPM_USERNAME)\r"

expect "Password:"

send -- "$env(NPM_PASSWORD)\r"

expect "Email: (this IS public)"

send -- "$env(NPM_EMAIL)\r"

expect eof

