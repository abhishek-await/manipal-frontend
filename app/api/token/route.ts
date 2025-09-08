import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const access = cookieStore.get('accessToken')?.value
        const refresh = cookieStore.get('refreshToken')?.value
        console.log(cookieStore.has('accessToken'))
        console.log("access: ", access)
        console.log("refresh: ", refresh)
        return Response.json({
            access,
            refresh,
            message: "Cookies fetched successfully"
        }, {
            status: 200
        })
    } catch (error) {
        console.error("Error fetching cookies: ", error)
        return Response.json({
            message: `Error fetching cookies: ${error}`
        }, {status: 500})
    }
}

export async function POST(req: NextRequest) {
    try {
        const {access,refresh} = await req.json()

        if(!access || !refresh){
            return Response.json({
                message: "Token not found"
            }, {status: 400})
        }
        const cookieStore = await cookies()
        cookieStore.set("accessToken", access, {expires: new Date(Date.now()+24*60*60*1000), httpOnly: true})
        cookieStore.set("refreshToken", refresh, {expires: new Date(Date.now()+7*24*60*60*1000), httpOnly: true})

        return Response.json({
            message: "Cookie set successfully",
        }, {status: 200})
    } catch (error) {
        console.error("Error setting cookies", error)
        return Response.json({
            message: `Error setting cookies: ${error}`
        }, {status: 500})
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        cookieStore.delete('accessToken')
        cookieStore.delete('refreshToken')
        return Response.json({
            message: "Deleted tokens successfully"
        }, {status: 200})
    } catch (error) {
        console.error("Error deleting cookies: ", error)
        return Response.json({
            message: "Error Deleting cookies"
        }, {status: 500})
    }
}